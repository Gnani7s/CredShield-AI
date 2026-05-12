import Link from 'next/link'
import { Shield, Zap, Eye, Lock, ArrowRight, CheckCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#07090f] text-white overflow-x-hidden">
      {/* Scanline */}
      <div className="fixed inset-0 scanline pointer-events-none z-50" />

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-40 border-b border-[#1e2535] bg-[#07090f]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#00d4ff] flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-[#07090f]" strokeWidth={2.5} />
            </div>
            <span className="font-mono font-bold text-sm tracking-wide">CredShield AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#8892a4] hover:text-white transition-colors">Login</Link>
            <Link href="/register" className="btn-primary py-2 px-4 text-xs rounded-lg">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 relative">
        {/* Glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#00d4ff]/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-[#ff4757]/10 border border-[#ff4757]/20 rounded-full px-4 py-1.5 text-xs font-mono text-[#ff4757] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff4757] animate-pulse-dot" />
            Live threat detection active
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
            One User.{' '}
            <span className="gradient-text">One Identity.</span>
            <br />Zero Credit Abuse.
          </h1>

          <p className="text-[#8892a4] text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            AI-powered fraud detection that identifies multi-account abuse using device fingerprinting,
            behavioral biometrics, and IP intelligence — even through VPNs and incognito mode.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="btn-primary inline-flex items-center justify-center gap-2">
              Create Free Account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/admin" className="btn-secondary inline-flex items-center justify-center gap-2">
              Admin Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6 border-t border-[#1e2535]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">How Detection Works</h2>
          <p className="text-[#8892a4] text-center mb-12 text-sm sm:text-base">Six layers of real-time fraud analysis on every registration</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Eye, color: '#00d4ff', title: 'Device Fingerprinting', desc: 'Canvas, WebGL, audio, fonts and 15+ signals combined into a unique device hash — survives cookie deletion and incognito.' },
              { icon: Zap, color: '#a855f7', title: 'Behavioral Biometrics', desc: 'Typing rhythm, keystroke dwell/flight times, and mouse movement patterns identify the same human across accounts.' },
              { icon: Shield, color: '#ff8c42', title: 'IP Intelligence', desc: 'Real-time VPN, Tor, proxy, and datacenter detection. Subnet clustering catches registration farms.' },
              { icon: Lock, color: '#00e676', title: 'Risk Scoring Engine', desc: 'Weighted scoring across all signals produces a 0–100 fraud score. Auto-block at threshold, flag for review below.' },
              { icon: Eye, color: '#ffd32a', title: 'Email Analysis', desc: '1000+ disposable and anonymous email domains checked. Temporary inboxes blocked automatically.' },
              { icon: Shield, color: '#ff4757', title: 'Linked Account Graph', desc: 'Graph-based clustering links accounts by shared device, IP, behavior and registration timing.' },
            ].map((f) => (
              <div key={f.title} className="card card-hover p-5">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: `${f.color}15` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
                <p className="text-[#8892a4] text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 sm:px-6 border-t border-[#1e2535] bg-[#0d1018]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: '97.3%', label: 'Detection accuracy' },
            { value: '<200ms', label: 'Analysis time' },
            { value: '2.1%', label: 'False positive rate' },
            { value: '15+', label: 'Fraud signals' },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-[#00d4ff] mb-1">{s.value}</div>
              <div className="text-xs text-[#4a5468] uppercase tracking-wider font-mono">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 border-t border-[#1e2535]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Test the Detection Now</h2>
          <p className="text-[#8892a4] text-sm mb-8">Register below — your own device fingerprint and IP will be analyzed in real time. See your risk score instantly.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="btn-primary inline-flex items-center justify-center gap-2">
              Register & See Your Risk Score <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-[#4a5468]">
            {['No spam', 'Real analysis', 'Instant results'].map(t => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-[#00e676]" />{t}</span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#1e2535] py-8 px-4 text-center">
        <p className="font-mono text-xs text-[#4a5468]">CredShield AI © {new Date().getFullYear()} — One User. One Identity. Zero Credit Abuse.</p>
      </footer>
    </main>
  )
}
