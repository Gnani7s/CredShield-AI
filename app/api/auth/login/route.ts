import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, createToken, setSession } from '@/lib/auth'
import { getIPIntelligence, getRealIP } from '@/lib/ip-intelligence'
import { runFraudCheck, persistFraudResult } from '@/lib/fraud-engine'

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  fingerprint: z.object({
    hash: z.string(), browserName: z.string(), browserVersion: z.string(),
    osName: z.string(), osVersion: z.string(), screenResolution: z.string(),
    timezone: z.string(), cpuCores: z.number(), canvasHash: z.string(),
    audioHash: z.string(), fontsHash: z.string(), webglRenderer: z.string(),
    webglVendor: z.string(), touchSupport: z.boolean(), language: z.string(),
    colorDepth: z.number(), deviceMemory: z.number(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { email, password, fingerprint } = parsed.data

    const { data: user } = await supabaseAdmin
      .from('users').select('id,email,password_hash,role,blocked,risk_score,risk_level,credits_allocated,credits_used')
      .eq('email', email).single()

    if (!user) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    if (user.blocked) return NextResponse.json({ error: 'Account suspended. Contact support.' }, { status: 403 })

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })

    // Update last_seen and run incremental fraud check on login
    const ip = getRealIP(req)
    await supabaseAdmin.from('users').update({ last_seen: new Date().toISOString(), ip_address: ip }).eq('id', user.id)

    // Re-check fingerprint on login (device may have changed)
    if (fingerprint) {
      const ipInfo = await getIPIntelligence(ip)
      const result = await runFraudCheck({ userId: user.id, email, fingerprint, ipInfo })
      if (result.blocked && !user.blocked) {
        await persistFraudResult({ userId: user.id, email, result, ipInfo, fingerprint })
        return NextResponse.json({ error: 'Login blocked: suspicious device activity.' }, { status: 403 })
      }
    }

    const token = createToken(user.id, email, user.role)
    setSession(token)

    return NextResponse.json({
      success: true, userId: user.id, email: user.email,
      role: user.role, riskScore: user.risk_score, riskLevel: user.risk_level,
      creditsAllocated: user.credits_allocated, creditsUsed: user.credits_used,
    })

  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
