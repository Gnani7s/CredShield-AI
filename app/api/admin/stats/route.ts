import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since24h = new Date(Date.now() - 86400000).toISOString()
  const since7d = new Date(Date.now() - 7 * 86400000).toISOString()

  const [
    { count: totalUsers },
    { count: blockedTotal },
    { count: blockedToday },
    { count: flaggedToday },
    { count: vpnDetections },
    { count: torDetections },
    { count: highRisk },
    { data: recentLogs },
    { data: riskDist },
    { data: dailyActivity },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('blocked', true),
    supabaseAdmin.from('fraud_logs').select('id', { count: 'exact', head: true }).eq('action', 'blocked').gte('created_at', since24h),
    supabaseAdmin.from('fraud_logs').select('id', { count: 'exact', head: true }).eq('action', 'flagged').gte('created_at', since24h),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('vpn_detected', true),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('tor_detected', true),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).gte('risk_score', 60),
    supabaseAdmin.from('fraud_logs').select('*').order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('users').select('risk_level').gte('created_at', since7d),
    supabaseAdmin.from('fraud_logs').select('created_at,action').gte('created_at', since7d).order('created_at', { ascending: true }),
  ])

  // Compute avg risk score
  const { data: riskScores } = await supabaseAdmin.from('users').select('risk_score').gte('created_at', since7d)
  const avgRisk = riskScores && riskScores.length > 0
    ? Math.round(riskScores.reduce((s, r) => s + r.risk_score, 0) / riskScores.length)
    : 0

  // Risk distribution
  const dist = { safe: 0, low: 0, medium: 0, high: 0, critical: 0 }
  riskDist?.forEach((u: any) => { if (u.risk_level in dist) dist[u.risk_level as keyof typeof dist]++ })

  // Daily fraud trend (last 7 days)
  const days: Record<string, { blocked: number; flagged: number; allowed: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    days[key] = { blocked: 0, flagged: 0, allowed: 0 }
  }
  dailyActivity?.forEach((log: any) => {
    const key = log.created_at.slice(0, 10)
    if (days[key]) days[key][log.action as keyof typeof days[string]]++
  })

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    blockedTotal: blockedTotal ?? 0,
    blockedToday: blockedToday ?? 0,
    flaggedToday: flaggedToday ?? 0,
    vpnDetections: vpnDetections ?? 0,
    torDetections: torDetections ?? 0,
    highRisk: highRisk ?? 0,
    avgRiskScore: avgRisk,
    creditsSaved: (blockedTotal ?? 0) * 100, // $1 per 100 credits per blocked user
    riskDistribution: dist,
    dailyTrend: Object.entries(days).map(([date, v]) => ({ date, ...v })),
    recentLogs: recentLogs ?? [],
  })
}
