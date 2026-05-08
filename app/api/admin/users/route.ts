import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const filter = searchParams.get('filter') ?? 'all'
  const search = searchParams.get('search') ?? ''
  const offset = (page - 1) * limit

  let query = supabaseAdmin.from('users').select('id,email,role,risk_score,risk_level,blocked,fraud_reasons,ip_address,country,vpn_detected,tor_detected,linked_accounts,credits_allocated,credits_used,created_at,last_seen', { count: 'exact' })

  if (filter === 'blocked') query = query.eq('blocked', true)
  else if (filter === 'high') query = query.gte('risk_score', 60)
  else if (filter === 'vpn') query = query.eq('vpn_detected', true)
  else if (filter === 'safe') query = query.lte('risk_score', 19)

  if (search) query = query.ilike('email', `%${search}%`)

  const { data, count, error } = await query
    .order('risk_score', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ users: data ?? [], total: count ?? 0, page, limit })
}
