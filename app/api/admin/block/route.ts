import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

const Schema = z.object({ userId: z.string().uuid(), block: z.boolean() })

export async function POST(req: NextRequest) {
  const session = getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { userId, block } = parsed.data

  // Prevent admin from blocking themselves
  if (userId === session.userId) return NextResponse.json({ error: 'Cannot block your own account.' }, { status: 400 })

  const { error } = await supabaseAdmin.from('users').update({
    blocked: block,
    ...(block ? { credits_allocated: 0 } : {}),
  }).eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (block) {
    await supabaseAdmin.from('fraud_logs').insert({
      user_id: userId,
      email: 'admin-action',
      fraud_score: 100,
      risk_level: 'critical',
      reasons: ['Manually blocked by admin'],
      blocked: true,
      action: 'blocked',
    })
  }

  return NextResponse.json({ success: true, blocked: block })
}
