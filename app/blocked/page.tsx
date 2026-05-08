import Link from 'next/link'
import { Shield, AlertTriangle } from 'lucide-react'

export default function BlockedPage() {
  return (
    <div className="min-h-screen bg-[#07090f] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-[#ff4757]/10 border border-[#ff4757]/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-[#ff4757]" />
        </div>
        <h1 className="font-mono text-2xl font-bold text-[#ff4757] mb-3">Access Blocked</h1>
        <p className="text-[#8892a4] text-sm leading-relaxed mb-8">
          Your account has been suspended due to suspicious activity detected by our fraud prevention system.
          This may include device fingerprint matches, VPN usage, or behavioral anomalies.
        </p>
        <div className="card p-5 mb-6 text-left space-y-3">
          <div className="text-xs font-mono text-[#4a5468] uppercase tracking-wider mb-3">What triggered this?</div>
          {['Multiple accounts from the same device','VPN or Tor exit node detected','Behavioral pattern matched known fraud','Rapid account creation from your IP'].map(r => (
            <div key={r} className="flex items-start gap-2 text-sm text-[#8892a4]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff4757] mt-1.5 flex-shrink-0" />
              {r}
            </div>
          ))}
        </div>
        <p className="text-xs text-[#4a5468]">
          To appeal, contact{' '}
          <a href="mailto:support@credshield.ai" className="text-[#00d4ff] underline">support@credshield.ai</a>
        </p>
        <Link href="/" className="btn-secondary inline-flex mt-6 text-sm">← Back to Home</Link>
      </div>
    </div>
  )
}
