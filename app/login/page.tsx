'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useFingerprint } from '@/hooks/useFingerprint'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const { fingerprint } = useFingerprint()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fingerprint }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Welcome back!')
        router.push(data.role === 'admin' ? '/admin' : '/dashboard')
      } else {
        toast.error(data.error ?? 'Login failed.')
      }
    } catch {
      toast.error('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07090f] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-md bg-[#00d4ff] flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-[#07090f]" strokeWidth={2.5} />
            </div>
            <span className="font-mono font-bold text-sm tracking-wide">CredShield AI</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Sign In</h1>
          <p className="text-[#8892a4] text-sm">Your device is checked on every login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[#8892a4] mb-2 uppercase tracking-wider">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input-field" autoComplete="email" />
          </div>
          <div>
            <label className="block text-xs font-mono text-[#8892a4] mb-2 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="input-field pr-10" autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5468] hover:text-[#8892a4]">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Authenticating…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-[#0d1018] border border-[#1e2535] rounded-lg text-xs text-[#4a5468] font-mono">
          <div className="text-[#8892a4] mb-2 font-bold">Admin credentials (demo):</div>
          <div>Email: admin@credshield.ai</div>
          <div>Password: Admin@CredShield2024</div>
        </div>

        <p className="text-center text-xs text-[#4a5468] mt-5">
          No account? <Link href="/register" className="text-[#00d4ff] hover:underline">Register</Link>
        </p>
      </div>
    </div>
  )
}
