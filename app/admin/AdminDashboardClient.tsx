'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Users, AlertTriangle, TrendingUp, Wifi, Globe, RefreshCw, LogOut, Search, ChevronLeft, ChevronRight, Ban, CheckCircle, Loader2, Activity, Eye } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import toast from 'react-hot-toast'

function RiskBadge({ level }: { level: string }) {
  const cls: Record<string, string> = { safe: 'risk-safe', low: 'risk-low', medium: 'risk-medium', high: 'risk-high', critical: 'risk-critical' }
  return <span className={`risk-badge ${cls[level] ?? 'risk-safe'}`}>{level?.toUpperCase() ?? 'SAFE'}</span>
}

function ActionBadge({ action }: { action: string }) {
  if (action === 'blocked') return <span className="risk-badge risk-critical">BLOCKED</span>
  if (action === 'flagged') return <span className="risk-badge risk-medium">FLAGGED</span>
  return <span className="risk-badge risk-safe">ALLOWED</span>
}

const StatCard = ({ label, value, sub, color, icon: Icon }: any) => (
  <div className="card p-5 card-hover" style={{ borderTopColor: color, borderTopWidth: 2 }}>
    <div className="flex items-start justify-between mb-3">
      <span className="text-xs font-mono text-[#4a5468] uppercase tracking-wider">{label}</span>
      <Icon className="w-4 h-4 opacity-40" style={{ color }} />
    </div>
    <div className="font-mono text-2xl sm:text-3xl font-bold" style={{ color }}>{value}</div>
    {sub && <div className="text-xs text-[#4a5468] mt-1">{sub}</div>}
  </div>
)

export default function AdminDashboardClient({ adminEmail }: { adminEmail: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<'overview' | 'users' | 'logs'>('overview')
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userPage, setUserPage] = useState(1)
  const [userTotal, setUserTotal] = useState(0)
  const [logPage, setLogPage] = useState(1)
  const [logTotal, setLogTotal] = useState(0)
  const [userFilter, setUserFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [logFilter, setLogFilter] = useState('all')
  const [blockingId, setBlockingId] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchStats = useCallback(async () => {
    const r = await fetch('/api/admin/stats')
    if (!r.ok) { if (r.status === 401) router.push('/login'); return }
    setStats(await r.json())
  }, [router])

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams({ page: String(userPage), limit: '15', filter: userFilter, search })
    const r = await fetch(`/api/admin/users?${params}`)
    if (!r.ok) return
    const d = await r.json()
    setUsers(d.users); setUserTotal(d.total)
  }, [userPage, userFilter, search])

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams({ page: String(logPage), limit: '20', action: logFilter })
    const r = await fetch(`/api/admin/logs?${params}`)
    if (!r.ok) return
    const d = await r.json()
    setLogs(d.logs); setLogTotal(d.total)
  }, [logPage, logFilter])

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    await Promise.all([fetchStats(), tab === 'users' ? fetchUsers() : fetchLogs()])
    setLastRefresh(new Date())
    if (!silent) setRefreshing(false)
  }, [fetchStats, fetchUsers, fetchLogs, tab])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await fetchStats()
      await fetchUsers()
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => { if (tab === 'users') fetchUsers() }, [tab, userPage, userFilter, search])
  useEffect(() => { if (tab === 'logs') fetchLogs() }, [tab, logPage, logFilter])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => refresh(true), 30000)
    return () => clearInterval(interval)
  }, [refresh])

  async function toggleBlock(userId: string, currentlyBlocked: boolean) {
    setBlockingId(userId)
    try {
      const r = await fetch('/api/admin/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, block: !currentlyBlocked }),
      })
      const d = await r.json()
      if (r.ok) {
        toast.success(d.blocked ? 'Account blocked' : 'Account unblocked')
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, blocked: d.blocked } : u))
        fetchStats()
      } else toast.error(d.error)
    } catch { toast.error('Failed to update account') }
    finally { setBlockingId(null) }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#07090f] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-[#00d4ff] animate-spin mx-auto mb-4" />
        <p className="font-mono text-sm text-[#4a5468]">Loading dashboard…</p>
      </div>
    </div>
  )

  const totalPages = (total: number) => Math.ceil(total / (tab === 'users' ? 15 : 20))

  const DIST_COLORS: Record<string, string> = { safe: '#00e676', low: '#ffd32a', medium: '#ff8c42', high: '#ff6b35', critical: '#ff4757' }

  return (
    <div className="min-h-screen bg-[#07090f]">
      {/* Topbar */}
      <header className="border-b border-[#1e2535] bg-[#0d1018] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-md bg-[#00d4ff] flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#07090f]" strokeWidth={2.5} />
            </div>
            <span className="font-mono font-bold text-sm hidden sm:block">CredShield AI</span>
            <span className="text-xs px-2 py-0.5 bg-[#ff4757]/10 text-[#ff4757] border border-[#ff4757]/20 rounded-full font-mono hidden sm:inline">ADMIN</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5 text-xs text-[#4a5468] font-mono">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse-dot" />
              <span className="hidden sm:inline">Live • {lastRefresh.toTimeString().slice(0,5)}</span>
            </div>
            <button onClick={() => refresh()} disabled={refreshing} className="p-2 text-[#4a5468] hover:text-white transition-colors rounded-lg hover:bg-[#111520]">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={logout} className="flex items-center gap-1.5 text-xs text-[#4a5468] hover:text-white transition-colors p-2 rounded-lg hover:bg-[#111520]">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#0d1018] border border-[#1e2535] rounded-xl p-1 w-fit">
          {[['overview','Overview'],['users','Users'],['logs','Fraud Logs']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)} className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${tab === id ? 'bg-[#00d4ff] text-[#07090f]' : 'text-[#4a5468] hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && stats && (
          <div className="animate-fade-in">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard label="Total Users" value={stats.totalUsers?.toLocaleString()} sub="registered accounts" color="#00d4ff" icon={Users} />
              <StatCard label="Blocked Total" value={stats.blockedTotal?.toLocaleString()} sub={`${stats.blockedToday} today`} color="#ff4757" icon={Ban} />
              <StatCard label="High Risk" value={stats.highRisk?.toLocaleString()} sub="score ≥ 60" color="#ff8c42" icon={AlertTriangle} />
              <StatCard label="Credits Saved" value={`$${((stats.creditsSaved ?? 0) / 100).toLocaleString()}`} sub="estimated value" color="#00e676" icon={TrendingUp} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard label="VPN Detections" value={stats.vpnDetections?.toLocaleString()} color="#a855f7" icon={Wifi} />
              <StatCard label="Tor Detections" value={stats.torDetections?.toLocaleString()} color="#ff4757" icon={Globe} />
              <StatCard label="Flagged Today" value={stats.flaggedToday?.toLocaleString()} color="#ffd32a" icon={Eye} />
              <StatCard label="Avg Risk Score" value={stats.avgRiskScore ?? 0} sub="last 7 days" color="#00d4ff" icon={Activity} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Trend chart */}
              <div className="card p-5 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-mono text-xs text-[#4a5468] uppercase tracking-wider">7-Day Fraud Trend</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats.dailyTrend ?? []}>
                    <defs>
                      <linearGradient id="blocked" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff4757" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ff4757" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="flagged" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff8c42" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ff8c42" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#4a5468', fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: '#4a5468', fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: '#111520', border: '1px solid #1e2535', borderRadius: '8px', fontSize: '12px', fontFamily: 'Space Mono' }} />
                    <Area type="monotone" dataKey="blocked" stroke="#ff4757" fill="url(#blocked)" strokeWidth={2} name="Blocked" />
                    <Area type="monotone" dataKey="flagged" stroke="#ff8c42" fill="url(#flagged)" strokeWidth={2} name="Flagged" />
                    <Area type="monotone" dataKey="allowed" stroke="#00e676" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Allowed" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Risk distribution */}
              <div className="card p-5">
                <h3 className="font-mono text-xs text-[#4a5468] uppercase tracking-wider mb-4">Risk Distribution</h3>
                {stats.riskDistribution && (
                  <>
                    <PieChart width={160} height={160} style={{ margin: '0 auto' }}>
                      <Pie data={Object.entries(stats.riskDistribution).map(([k, v]) => ({ name: k, value: v }))} cx={75} cy={75} innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                        {Object.keys(stats.riskDistribution).map((k) => <Cell key={k} fill={DIST_COLORS[k]} />)}
                      </Pie>
                    </PieChart>
                    <div className="space-y-2 mt-3">
                      {Object.entries(stats.riskDistribution).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: DIST_COLORS[k] }} />
                            <span className="text-[#8892a4] font-mono capitalize">{k}</span>
                          </div>
                          <span className="font-mono font-bold" style={{ color: DIST_COLORS[k] }}>{v as number}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Recent logs */}
            <div className="card">
              <div className="p-4 border-b border-[#1e2535]">
                <h3 className="font-mono text-xs text-[#4a5468] uppercase tracking-wider">Recent Events</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-[#1e2535]">
                    {['Time','Email','Score','Level','Action','IP','Country'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-mono text-[#4a5468] uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {(stats.recentLogs ?? []).map((log: any) => (
                      <tr key={log.id} className="border-b border-[#1e2535]/50 hover:bg-[#0d1018] transition-colors">
                        <td className="px-4 py-3 font-mono text-[#4a5468] whitespace-nowrap">{new Date(log.createdAt || log.created_at).toTimeString().slice(0,8)}</td>
                        <td className="px-4 py-3 text-[#8892a4] max-w-[160px] truncate">{log.email}</td>
                        <td className="px-4 py-3 font-mono font-bold" style={{ color: log.fraud_score >= 80 ? '#ff4757' : log.fraud_score >= 60 ? '#ff8c42' : log.fraud_score >= 40 ? '#ffd32a' : '#00e676' }}>{log.fraud_score}</td>
                        <td className="px-4 py-3"><RiskBadge level={log.risk_level ?? 'safe'} /></td>
                        <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                        <td className="px-4 py-3 font-mono text-[#4a5468]">{log.ip_address}</td>
                        <td className="px-4 py-3 text-[#8892a4]">{log.country}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5468]" />
                <input value={search} onChange={e => { setSearch(e.target.value); setUserPage(1) }} placeholder="Search by email…" className="input-field pl-9 py-2.5" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[['all','All'],['blocked','Blocked'],['high','High Risk'],['vpn','VPN']].map(([v, l]) => (
                  <button key={v} onClick={() => { setUserFilter(v); setUserPage(1) }} className={`px-3 py-2 rounded-lg text-xs font-mono transition-all ${userFilter === v ? 'bg-[#00d4ff] text-[#07090f] font-bold' : 'bg-[#0d1018] border border-[#1e2535] text-[#8892a4] hover:text-white'}`}>{l}</button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-[#1e2535]">
                    {['Email','Risk','Level','VPN','Linked','Country','Credits','Joined','Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-mono text-[#4a5468] uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className={`border-b border-[#1e2535]/50 hover:bg-[#0d1018] transition-colors ${u.blocked ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3 text-[#8892a4] max-w-[180px] truncate font-mono">{u.email}</td>
                        <td className="px-4 py-3 font-mono font-bold" style={{ color: u.risk_score >= 80 ? '#ff4757' : u.risk_score >= 60 ? '#ff8c42' : u.risk_score >= 40 ? '#ffd32a' : '#00e676' }}>{u.risk_score}</td>
                        <td className="px-4 py-3"><RiskBadge level={u.risk_level} /></td>
                        <td className="px-4 py-3">
                          {u.vpn_detected ? <span className="text-[#ff8c42] font-mono">VPN</span> : u.tor_detected ? <span className="text-[#ff4757] font-mono">TOR</span> : <span className="text-[#00e676]">✓</span>}
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: u.linked_accounts > 0 ? '#ff4757' : '#4a5468' }}>{u.linked_accounts}</td>
                        <td className="px-4 py-3 text-[#8892a4]">{u.country ?? '—'}</td>
                        <td className="px-4 py-3 text-[#4a5468] font-mono">{u.credits_allocated - u.credits_used}/{u.credits_allocated}</td>
                        <td className="px-4 py-3 text-[#4a5468] whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleBlock(u.id, u.blocked)} disabled={blockingId === u.id} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-mono font-bold transition-all ${u.blocked ? 'bg-[#00e676]/10 text-[#00e676] hover:bg-[#00e676]/20' : 'bg-[#ff4757]/10 text-[#ff4757] hover:bg-[#ff4757]/20'}`}>
                            {blockingId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : u.blocked ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                            {u.blocked ? 'Unblock' : 'Block'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-12 text-center text-[#4a5468] font-mono">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {userTotal > 15 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e2535]">
                  <span className="text-xs text-[#4a5468] font-mono">{userTotal} total</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1} className="p-1.5 rounded-md hover:bg-[#1e2535] disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-xs font-mono text-[#8892a4]">{userPage}/{totalPages(userTotal)}</span>
                    <button onClick={() => setUserPage(p => Math.min(totalPages(userTotal), p + 1))} disabled={userPage >= totalPages(userTotal)} className="p-1.5 rounded-md hover:bg-[#1e2535] disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOGS */}
        {tab === 'logs' && (
          <div className="animate-fade-in">
            <div className="flex gap-2 mb-4 flex-wrap">
              {[['all','All Actions'],['blocked','Blocked'],['flagged','Flagged'],['allowed','Allowed']].map(([v, l]) => (
                <button key={v} onClick={() => { setLogFilter(v); setLogPage(1) }} className={`px-3 py-2 rounded-lg text-xs font-mono transition-all ${logFilter === v ? 'bg-[#00d4ff] text-[#07090f] font-bold' : 'bg-[#0d1018] border border-[#1e2535] text-[#8892a4] hover:text-white'}`}>{l}</button>
              ))}
            </div>

            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-[#1e2535]">
                    {['Time','Email','Score','Level','Action','IP','Country','Reasons'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-mono text-[#4a5468] uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className="border-b border-[#1e2535]/50 hover:bg-[#0d1018] transition-colors">
                        <td className="px-4 py-3 font-mono text-[#4a5468] whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-[#8892a4] max-w-[160px] truncate">{log.email}</td>
                        <td className="px-4 py-3 font-mono font-bold" style={{ color: log.fraud_score >= 80 ? '#ff4757' : log.fraud_score >= 60 ? '#ff8c42' : '#00e676' }}>{log.fraud_score}</td>
                        <td className="px-4 py-3"><RiskBadge level={log.risk_level ?? 'safe'} /></td>
                        <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                        <td className="px-4 py-3 font-mono text-[#4a5468]">{log.ip_address}</td>
                        <td className="px-4 py-3 text-[#8892a4]">{log.country}</td>
                        <td className="px-4 py-3 text-[#4a5468] max-w-[240px]">
                          <div className="truncate" title={(log.reasons ?? []).join(', ')}>{(log.reasons ?? []).slice(0,1).join('; ')}</div>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-[#4a5468] font-mono">No logs found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {logTotal > 20 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e2535]">
                  <span className="text-xs text-[#4a5468] font-mono">{logTotal} total events</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage === 1} className="p-1.5 rounded-md hover:bg-[#1e2535] disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-xs font-mono text-[#8892a4]">{logPage}/{totalPages(logTotal)}</span>
                    <button onClick={() => setLogPage(p => Math.min(totalPages(logTotal), p + 1))} disabled={logPage >= totalPages(logTotal)} className="p-1.5 rounded-md hover:bg-[#1e2535] disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
