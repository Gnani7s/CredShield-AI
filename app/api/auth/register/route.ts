import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, createToken, setSession } from '@/lib/auth'
import { runFraudCheck, persistFraudResult } from '@/lib/fraud-engine'
import { getIPIntelligence, getRealIP } from '@/lib/ip-intelligence'

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fingerprint: z.object({
    hash: z.string(), browserName: z.string(), browserVersion: z.string(),
    osName: z.string(), osVersion: z.string(), screenResolution: z.string(),
    timezone: z.string(), cpuCores: z.number(), canvasHash: z.string(),
    audioHash: z.string(), fontsHash: z.string(), webglRenderer: z.string(),
    webglVendor: z.string(), touchSupport: z.boolean(), language: z.string(),
    colorDepth: z.number(), deviceMemory: z.number(),
  }),
  behavior: z.object({
    typingSpeed: z.array(z.number()), keystrokeDwells: z.array(z.number()),
    keystrokeFlights: z.array(z.number()),
    mouseMovements: z.array(z.object({ x: z.number(), y: z.number(), t: z.number() })),
    scrollDepth: z.number(), sessionDuration: z.number(), clickCount: z.number(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { email, password, fingerprint, behavior } = parsed.data
    const ip = getRealIP(req)

    // Check duplicate email
    const { data: existing } = await supabaseAdmin.from('users').select('id,blocked').eq('email', email).maybeSingle()
    if (existing) {
      if (existing.blocked) return NextResponse.json({ error: 'Account suspended for policy violations.' }, { status: 403 })
      return NextResponse.json({ error: 'Email already registered.' }, { status: 409 })
    }

    const [ipInfo, passwordHash] = await Promise.all([getIPIntelligence(ip), hashPassword(password)])

    // Create user
    const { data: user, error: createErr } = await supabaseAdmin
      .from('users').insert({
        email, password_hash: passwordHash,
        ip_address: ip, country: ipInfo.country,
        vpn_detected: ipInfo.isVpn, tor_detected: ipInfo.isTor,
        fingerprint_hash: fingerprint.hash,
      }).select('id').single()

    if (createErr || !user) {
      return NextResponse.json({ error: 'Registration failed. Try again.' }, { status: 500 })
    }

    // Run fraud check
    const result = await runFraudCheck({ userId: user.id, email, fingerprint, ipInfo, behavior })

    // Persist everything
    await persistFraudResult({ userId: user.id, email, result, ipInfo, fingerprint, behavior })

    // Log IP
    await supabaseAdmin.from('ip_logs').insert({
      ip_address: ip, user_id: user.id, country: ipInfo.country, org: ipInfo.org,
      is_vpn: ipInfo.isVpn, is_tor: ipInfo.isTor, is_proxy: ipInfo.isProxy,
      is_hosting: ipInfo.isHosting, threat_score: ipInfo.threatScore,
    })

    if (result.blocked) {
      return NextResponse.json({
        error: 'Registration blocked due to suspicious activity. Contact support if you believe this is an error.',
        blocked: true, riskScore: result.riskScore,
      }, { status: 403 })
    }

    // Allocate credits based on risk
    const credits = result.riskLevel === 'safe' ? 100 : result.riskLevel === 'low' ? 75 : 25
    await supabaseAdmin.from('users').update({ credits_allocated: credits }).eq('id', user.id)

    const token = createToken(user.id, email, 'user')
    setSession(token)

    return NextResponse.json({
      success: true, userId: user.id, email,
      riskScore: result.riskScore, riskLevel: result.riskLevel,
      creditsAllocated: credits,
      warning: result.riskLevel !== 'safe' ? result.reasons[0] : null,
    }, { status: 201 })

  } catch (e) {
    console.error('Register error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
