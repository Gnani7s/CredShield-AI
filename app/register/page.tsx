'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff, Fingerprint, Wifi, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useBehavior } from '@/hooks/useBehavior'
import toast from 'react-hot-toast'

type Step = 'form' | 'analyzing' | 'result'

interface AnalysisResult {
  riskScore: number
  riskLevel: string
  creditsAllocated: number
  warning: string | null
  blocked: boolean
  error?: string
}

const STEPS = ['Collecting device signals…', 'Analyzing fingerprint…', 'Checking IP reputation…', 'Running behavioral analysis…', 'Computing fraud score…']

export default function RegisterPage() {
  const router = useRouter()
  const { fingerprint, loading: fpLoading } = useFingerprint()
  const { onKeyDown, onKeyUp, onMouseMove, onClick, getBehaviorData } = useBehavior()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [step, setStep] = useState<Step>('form')
  const [stepIdx, setStepIdx] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const riskColor = (level: string) => {
    const map: Record<string, string> = { safe: '#00e676', low: '#ffd32a', medium: '#ff8c42', high: '#ff6b35', critical: '#ff4757' }
    return map[level] ?? '#8892a4'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (fpLoading) { toast.error('Device analysis still loading…'); return }
    if (!fingerprint) { toast.error('Could not collect device data. Please enable JavaScript.'); return }
    if (!email || !password) { toast.error('Please fill all fields.'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters.'); return }

    setSubmitting(true)
    setStep('analyzing')

    // Simulate analysis steps for UX
    for (let i = 0; i < STEPS.length; i++) {
      setStepIdx(i)
      await new Promise(r => setTimeout(r, 600))
    }

    try {
      const behavior = getBehaviorData()
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fingerprint, behavior }),
      })
      const data = await res.json()

      if (res.ok) {
        setResult({ riskScore: data.riskScore, riskLevel: data.riskLevel, creditsAllocated: data.creditsAllocated, warning: data.warning, blocked: false })
        setStep('result')
      } else {
        setResult({ riskScore: data.riskScore ?? 0, riskLevel: 'critical', creditsAllocated: 0, warning: null, blocked: data.blocked ?? false, error: data.error })
        setStep('result')
      }
    } catch {
      toast.error('Network error. Please try again.')
      setStep('form')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'analyzing') {
    return (
      <div className="min-h-screen bg-[#07090f] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full border-2 border-[#00d4ff]/30 flex items-center justify-center mx-auto mb-6 relative">
            <Fingerprint className="w-9 h-9 text-[#00d4ff]" />
            <div className="absolute inset-0 rounded-full border-2 border-[#00d4ff] border-t-transparent animate-spin" />
          </div>
          <h2 className="font-mono text-lg font-bold text-white mb-2">Analyzing Your Device</h2>
          <p className="text-[#8892a4] text-sm mb-8">Running 6-layer fraud detection…</p>
          <div className="space-y-2">
            {STEPS.map((s, i) => (
              <div key={s} className={`flex items-center gap-3 text-sm px-4 py-2.5 rounded-lg transition-all ${i === stepIdx ? 'bg-[#00d4ff]/10 text-[#00d4ff]' : i < stepIdx ? 'text-[#00e676]' : 'text-[#4a5468]'}`}>
                {i < stepIdx ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : i === stepIdx ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" /> : <div className="w-4 h-4 rounded-full border border-current flex-shrink-0" />}
                <span className="font-mono text-xs">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (step === 'result' && result) {
    const color = riskColor(result.riskLevel)
    return (
      <div className="min-h-screen bg-[#07090f] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center animate-slide-up">
            {result.blocked ? (
              <>
                <div className="w-16 h-16 rounded-full bg-[#ff4757]/10 flex items-center justify-center mx-auto mb-5">
                  <AlertTriangle className="w-8 h-8 text-[#ff4757]" />
                </div>
                <h2 className="font-mono font-bold text-xl text-[#ff4757] mb-2">Registration Blocked</h2>
                <p className="text-[#8892a4] text-sm mb-6 leading-relaxed">{result.error ?? 'Suspicious activity detected on this device or network.'}</p>
                <div className="bg-[#ff4757]/10 border border-[#ff4757]/20 rounded-lg p-4 mb-6">
                  <div className="font-mono text-4xl font-bold text-[#ff4757] mb-1">{result.riskScore}</div>
                  <div className="text-xs text-[#8892a4] uppercase tracking-wider font-mono">Risk Score / 100</div>
                </div>
                <p className="text-xs text-[#4a5468]">If you believe this is an error, contact <a href="mailto:support@credshield.ai" className="text-[#00d4ff] underline">support@credshield.ai</a></p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: `${color}15` }}>
                  <CheckCircle className="w-8 h-8" style={{ color }} />
                </div>
                <h2 className="font-mono font-bold text-xl mb-2" style={{ color }}>Welcome to CredShield!</h2>
                <p className="text-[#8892a4] text-sm mb-6">Account created. Here's your fraud analysis:</p>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-[#0d1018] rounded-lg p-3 border border-[#1e2535]">
                    <div className="font-mono text-2xl font-bold mb-1" style={{ color }}>{result.riskScore}</div>
                    <div className="text-xs text-[#4a5468] uppercase tracking-wider">Risk Score</div>
                  </div>
                  <div className="bg-[#0d1018] rounded-lg p-3 border border-[#1e2535]">
                    <div className="font-mono text-2xl font-bold text-[#00e676] mb-1">{result.creditsAllocated}</div>
                    <div className="text-xs text-[#4a5468] uppercase tracking-wider">Credits</div>
                  </div>
                  <div className="bg-[#0d1018] rounded-lg p-3 border border-[#1e2535]">
                    <div className="font-mono text-xs font-bold mb-1 uppercase" style={{ color }}>{result.riskLevel}</div>
                    <div className="text-xs text-[#4a5468] uppercase tracking-wider">Risk Level</div>
                  </div>
                </div>
                {result.warning && (
                  <div className="bg-[#ff8c42]/10 border border-[#ff8c42]/20 rounded-lg p-3 mb-5 text-xs text-[#ff8c42] text-left flex gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{result.warning}</span>
                  </div>
                )}
                <button onClick={() => router.push('/dashboard')} className="btn-primary w-full">Go to Dashboard</button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#07090f] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-md bg-[#00d4ff] flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-[#07090f]" strokeWidth={2.5} />
            </div>
            <span className="font-mono font-bold text-sm tracking-wide">CredShield AI</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Create Account</h1>
          <p className="text-[#8892a4] text-sm">Your device will be fingerprinted on registration</p>
        </div>

        {/* Fingerprint status */}
        <div className={`flex items-center gap-3 rounded-lg px-4 py-3 border text-xs font-mono mb-5 transition-all ${fpLoading ? 'bg-[#ffd32a]/5 border-[#ffd32a]/20 text-[#ffd32a]' : 'bg-[#00d4ff]/5 border-[#00d4ff]/20 text-[#00d4ff]'}`}>
          {fpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" /> : <Wifi className="w-3.5 h-3.5 flex-shrink-0" />}
          {fpLoading ? 'Collecting device signals…' : `Device ID: ${fingerprint?.hash?.slice(0, 12) ?? '—'}… ready`}
        </div>

        <form onSubmit={handleSubmit} onMouseMove={onMouseMove} onClick={onClick} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[#8892a4] mb-2 uppercase tracking-wider">Email Address</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={onKeyDown} onKeyUp={onKeyUp}
              placeholder="you@example.com"
              className="input-field" autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-[#8892a4] mb-2 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={onKeyDown} onKeyUp={onKeyUp}
                placeholder="Min. 8 characters"
                className="input-field pr-10" autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5468] hover:text-[#8892a4]">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="flex gap-1 mt-2">
                {['8+ chars','Uppercase','Number','Symbol'].map((req, i) => {
                  const checks = [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password), /[^a-zA-Z0-9]/.test(password)]
                  return <div key={req} className={`flex-1 h-1 rounded-full transition-colors ${checks[i] ? 'bg-[#00e676]' : 'bg-[#1e2535]'}`} title={req} />
                })}
              </div>
            )}
          </div>

          <button type="submit" disabled={submitting || fpLoading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
            {fpLoading ? 'Loading device analysis…' : 'Register & Analyze Device'}
          </button>
        </form>

        <p className="text-center text-xs text-[#4a5468] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#00d4ff] hover:underline">Sign in</Link>
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[['Fingerprinted','Device ID'], ['Analyzed','IP & VPN'], ['Scored','0–100 Risk']].map(([v, l]) => (
            <div key={l} className="bg-[#0d1018] border border-[#1e2535] rounded-lg p-2">
              <div className="text-xs font-mono font-bold text-[#00d4ff]">{v}</div>
              <div className="text-[10px] text-[#4a5468] mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
