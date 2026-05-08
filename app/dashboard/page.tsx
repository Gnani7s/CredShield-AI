import { redirect } from 'next/navigation'
import { getSession, getUserById } from '@/lib/auth'
import { Shield, AlertTriangle, CheckCircle, Cpu, Globe, CreditCard, LogOut, Fingerprint } from 'lucide-react'
import Link from 'next/link'

function RiskBadge({ level }: { level: string }) {
  const classes: Record<string, string> = {
    safe: 'risk-safe', low: 'risk-low', medium: 'risk-medium', high: 'risk-high', critical: 'risk-critical',
  }
  return <span className={`risk-badge ${classes[level] ?? 'risk-safe'}`}>{level.toUpperCase()}</span>
}

function RiskGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#ff4757' : score >= 60 ? '#ff6b35' : score >= 40 ? '#ff8c42' : score >= 20 ? '#ffd32a' : '#00e676'
  const pct = score / 100
  const r = 40, cx = 50, cy = 55
  const circumference = Math.PI * r
  const offset = circumference * (1 - pct)
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 60" className="w-32">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1e2535" strokeWidth="8" strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="font-mono text-3xl font-bold mt-1" style={{ color }}>{score}</div>
      <div className="text-xs text-[#4a5468] font-mono uppercase tracking-wider">Risk Score</div>
    </div>
  )
}

export default async function DashboardPage() {
  const session = getSession()
  if (!session) redirect('/login')

  const user = await getUserById(session.userId)
  if (!user) redirect('/login')
  if (user.role === 'admin') redirect('/admin')

  async function logout() {
    'use server'
    const { clearSession } = await import('@/lib/auth')
    clearSession()
    redirect('/login')
  }

  const creditsUsedPct = user.credits_allocated > 0 ? Math.round((user.credits_used / user.credits_allocated) * 100) : 0

  return (
    <div className="min-h-screen bg-[#07090f]">
      {/* Nav */}
      <nav className="border-b border-[#1e2535] bg-[#0d1018]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#00d4ff] flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#07090f]" strokeWidth={2.5} />
            </div>
            <span className="font-mono font-bold text-sm">CredShield AI</span>
          </div>
          <form action={logout}>
            <button type="submit" className="flex items-center gap-1.5 text-xs text-[#4a5468] hover:text-white transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-xl font-bold mb-1">Your Account</h1>
          <p className="text-[#8892a4] text-sm font-mono">{user.email}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Risk Score */}
          <div className="card p-6 flex flex-col items-center sm:col-span-1 animate-slide-up">
            <RiskGauge score={user.risk_score} />
            <div className="mt-3"><RiskBadge level={user.risk_level} /></div>
          </div>

          {/* Status */}
          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-xs font-mono text-[#4a5468] uppercase tracking-wider mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8892a4]">Status</span>
                <span className={`risk-badge ${user.blocked ? 'risk-critical' : 'risk-safe'}`}>
                  {user.blocked ? '🚫 BLOCKED' : '✓ ACTIVE'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8892a4]">VPN Detected</span>
                <span className={`text-xs font-mono font-bold ${user.vpn_detected ? 'text-[#ff8c42]' : 'text-[#00e676]'}`}>
                  {user.vpn_detected ? '⚠ YES' : '✓ NO'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8892a4]">Linked Accounts</span>
                <span className={`font-mono text-sm font-bold ${user.linked_accounts > 0 ? 'text-[#ff4757]' : 'text-[#00e676]'}`}>
                  {user.linked_accounts}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8892a4]">Country</span>
                <span className="text-xs font-mono text-white">{user.country ?? 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Credits */}
          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-xs font-mono text-[#4a5468] uppercase tracking-wider mb-4">Free Credits</h3>
            <div className="text-3xl font-mono font-bold text-[#00e676] mb-1">
              {user.credits_allocated - user.credits_used}
              <span className="text-sm text-[#4a5468] ml-1">/ {user.credits_allocated}</span>
            </div>
            <div className="text-xs text-[#4a5468] mb-4">credits remaining</div>
            <div className="w-full bg-[#1e2535] rounded-full h-2">
              <div className="h-2 rounded-full bg-[#00e676] transition-all" style={{ width: `${100 - creditsUsedPct}%` }} />
            </div>
            <div className="text-xs text-[#4a5468] mt-2 font-mono">{creditsUsedPct}% used</div>
          </div>
        </div>

        {/* Device fingerprint info */}
        <div className="card p-5 mb-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-2 mb-4">
            <Fingerprint className="w-4 h-4 text-[#00d4ff]" />
            <h3 className="text-xs font-mono text-[#4a5468] uppercase tracking-wider">Device Fingerprint</h3>
          </div>
          <div className="font-mono text-xs text-[#8892a4] bg-[#0d1018] rounded-lg px-4 py-3 border border-[#1e2535] break-all">
            {user.fingerprint_hash ?? 'Not collected yet'}
          </div>
        </div>

        {/* Fraud reasons */}
        {user.fraud_reasons && user.fraud_reasons.length > 0 && (
          <div className="card p-5 border-[#ff8c42]/20 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-[#ff8c42]" />
              <h3 className="text-xs font-mono text-[#4a5468] uppercase tracking-wider">Risk Factors Detected</h3>
            </div>
            <ul className="space-y-2">
              {user.fraud_reasons.map((r: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#ff8c42]">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#ff8c42] flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {user.blocked && (
          <div className="mt-4 card border-[#ff4757]/30 bg-[#ff4757]/5 p-5 text-center">
            <AlertTriangle className="w-8 h-8 text-[#ff4757] mx-auto mb-3" />
            <h3 className="font-bold text-[#ff4757] mb-2">Account Suspended</h3>
            <p className="text-sm text-[#8892a4]">Your account has been suspended. Credits are frozen. Contact <a href="mailto:support@credshield.ai" className="text-[#00d4ff] underline">support@credshield.ai</a> to appeal.</p>
          </div>
        )}
      </main>
    </div>
  )
}
