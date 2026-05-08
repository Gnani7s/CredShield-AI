import type { IPInfo } from '@/types'

const PRIVATE_IPS = /^(127\.|::1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/

export function getRealIP(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

export async function getIPIntelligence(ip: string): Promise<IPInfo> {
  if (PRIVATE_IPS.test(ip) || ip === '127.0.0.1' || ip === '::1') {
    return { ip, country: 'Local', region: 'Local', city: 'Local', org: 'Local Network', isVpn: false, isTor: false, isProxy: false, isHosting: false, threatScore: 0 }
  }

  let base: IPInfo = { ip, country: 'Unknown', region: 'Unknown', city: 'Unknown', org: 'Unknown', isVpn: false, isTor: false, isProxy: false, isHosting: false, threatScore: 0 }

  // 1) ipapi.co — free, no key, 1000/day
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`, { next: { revalidate: 3600 } })
    if (r.ok) {
      const d = await r.json()
      if (!d.error) {
        const org = (d.org ?? '').toLowerCase()
        base = {
          ...base,
          country: d.country_name ?? 'Unknown',
          region: d.region ?? 'Unknown',
          city: d.city ?? 'Unknown',
          org: d.org ?? 'Unknown',
          isVpn: isVpnOrg(org),
          isHosting: isHostingOrg(org),
          threatScore: isVpnOrg(org) ? 65 : isHostingOrg(org) ? 30 : 0,
        }
      }
    }
  } catch { /* continue */ }

  // 2) IPQualityScore — free 5000/month, better VPN/Tor detection
  const ipqsKey = process.env.IPQS_API_KEY
  if (ipqsKey && ipqsKey.length > 10) {
    try {
      const r = await fetch(
        `https://www.ipqualityscore.com/api/json/ip/${ipqsKey}/${ip}?strictness=1`,
        { next: { revalidate: 3600 } }
      )
      if (r.ok) {
        const d = await r.json()
        if (d.success !== false) {
          base.isVpn = d.vpn ?? base.isVpn
          base.isTor = d.tor ?? false
          base.isProxy = d.proxy ?? false
          base.isHosting = d.hosting ?? base.isHosting
          base.threatScore = d.fraud_score ?? base.threatScore
        }
      }
    } catch { /* continue */ }
  }

  return base
}

function isVpnOrg(org: string): boolean {
  return ['mullvad','nordvpn','expressvpn','protonvpn','surfshark','privatevpn','ipvanish','cyberghost','hotspot','tunnelbear','windscribe',' vpn'].some(k => org.includes(k))
}

function isHostingOrg(org: string): boolean {
  return ['amazon','google cloud','microsoft azure','digitalocean','linode','vultr','hetzner','ovh','scaleway','cloudflare','datacenter','hosting'].some(k => org.includes(k))
}
