import { supabaseAdmin } from './supabase'
import type { DeviceFingerprint, IPInfo, FraudCheckResult, BehaviorData } from '@/types'

const W = {
  SAME_FINGERPRINT: 40,
  SAME_CANVAS: 15,
  SAME_AUDIO: 10,
  SAME_WEBGL: 8,
  TOR: 30,
  VPN: 15,
  PROXY: 12,
  HOSTING: 6,
  HIGH_THREAT_IP: 25,
  MED_THREAT_IP: 10,
  RAPID_REGISTRATION: 20,
  SAME_IP_ACCOUNTS: 12,
  DISPOSABLE_EMAIL: 18,
  PRIVACY_EMAIL: 8,
  BEHAVIOR_MATCH: 20,
}

const DISPOSABLE = new Set(['tempmail.com','throwaway.email','guerrillamail.com','mailinator.com','yopmail.com','10minutemail.com','trashmail.com','fakeinbox.com','sharklasers.com','spam4.me','dispostable.com','maildrop.cc','discard.email','spamgourmet.com','temp.com','tmpmail.org','throwam.com','moakt.com','spambox.us','getairmail.com'])
const PRIVACY = new Set(['proton.me','pm.me','tutanota.com','tutanota.de','tuta.io','cock.li','disroot.org','riseup.net'])

export async function runFraudCheck(params: {
  userId: string; email: string
  fingerprint: DeviceFingerprint; ipInfo: IPInfo; behavior?: BehaviorData
}): Promise<FraudCheckResult> {
  const { userId, email, fingerprint, ipInfo, behavior } = params
  let score = 0
  const reasons: string[] = []
  const details: FraudCheckResult['details'] = {
    deviceMatch: false, vpnDetected: false, torDetected: false,
    behaviorSimilarity: 0, linkedAccounts: 0, ipReputation: 'clean', registrationVelocity: 0,
  }

  // ── 1. Device Fingerprint (exact match) ──
  const { data: exactMatch } = await supabaseAdmin
    .from('device_fingerprints')
    .select('user_id')
    .eq('fingerprint_hash', fingerprint.hash)
    .neq('user_id', userId)
    .limit(20)

  if (exactMatch && exactMatch.length > 0) {
    score += W.SAME_FINGERPRINT
    details.deviceMatch = true
    details.linkedAccounts = exactMatch.length
    reasons.push(`Device fingerprint matches ${exactMatch.length} existing account(s)`)
  } else {
    // Canvas hash match
    const { data: canvasMatch } = await supabaseAdmin
      .from('device_fingerprints').select('user_id')
      .eq('canvas_hash', fingerprint.canvasHash).neq('user_id', userId).limit(10)
    if (canvasMatch && canvasMatch.length > 0) {
      score += W.SAME_CANVAS
      details.linkedAccounts = Math.max(details.linkedAccounts, canvasMatch.length)
      reasons.push(`Canvas fingerprint matches ${canvasMatch.length} account(s)`)
    }

    // Audio hash match
    const { data: audioMatch } = await supabaseAdmin
      .from('device_fingerprints').select('user_id')
      .eq('audio_hash', fingerprint.audioHash).neq('user_id', userId).limit(10)
    if (audioMatch && audioMatch.length > 0) {
      score += W.SAME_AUDIO
      reasons.push(`Audio fingerprint matches ${audioMatch.length} account(s)`)
    }

    // WebGL match (GPU signature — hard to spoof)
    const { data: gpuMatch } = await supabaseAdmin
      .from('device_fingerprints').select('user_id')
      .eq('webgl_renderer', fingerprint.webglRenderer)
      .eq('webgl_vendor', fingerprint.webglVendor)
      .neq('user_id', userId).limit(10)
    if (gpuMatch && gpuMatch.length >= 3) {
      score += W.SAME_WEBGL
      reasons.push(`GPU signature matches ${gpuMatch.length} accounts`)
    }
  }

  // ── 2. Network / IP ──
  if (ipInfo.isTor) {
    score += W.TOR
    details.torDetected = true
    details.ipReputation = 'malicious'
    reasons.push('Tor exit node detected — high anonymity risk')
  } else if (ipInfo.isVpn) {
    score += W.VPN
    details.vpnDetected = true
    details.ipReputation = 'suspicious'
    reasons.push(`VPN detected (${ipInfo.org})`)
  } else if (ipInfo.isProxy) {
    score += W.PROXY
    details.ipReputation = 'suspicious'
    reasons.push('Proxy/anonymizer detected')
  }
  if (ipInfo.isHosting) {
    score += W.HOSTING
    reasons.push('Datacenter IP (non-residential)')
  }
  if (ipInfo.threatScore >= 75) {
    score += W.HIGH_THREAT_IP
    details.ipReputation = 'malicious'
    reasons.push(`IP threat score: ${ipInfo.threatScore}/100`)
  } else if (ipInfo.threatScore >= 50) {
    score += W.MED_THREAT_IP
    if (details.ipReputation === 'clean') details.ipReputation = 'suspicious'
  }

  // ── 3. Registration velocity from same IP ──
  const since24h = new Date(Date.now() - 86400000).toISOString()
  const { count: ipCount } = await supabaseAdmin
    .from('users').select('id', { count: 'exact', head: true })
    .eq('ip_address', ipInfo.ip).neq('id', userId).gte('created_at', since24h)

  const vel = ipCount ?? 0
  details.registrationVelocity = vel
  if (vel >= 4) {
    score += W.RAPID_REGISTRATION
    reasons.push(`${vel} accounts registered from this IP in last 24h`)
  } else if (vel >= 2) {
    score += W.SAME_IP_ACCOUNTS
    reasons.push(`${vel} other accounts share this IP`)
  }

  // ── 4. Subnet cluster check ──
  const subnet = ipInfo.ip.split('.').slice(0, 3).join('.')
  const { count: subnetCount } = await supabaseAdmin
    .from('users').select('id', { count: 'exact', head: true })
    .like('ip_address', `${subnet}.%`).neq('id', userId).gte('created_at', since24h)
  if ((subnetCount ?? 0) >= 5) {
    score += 8
    reasons.push(`Subnet cluster: ${subnetCount} signups from ${subnet}.x/24`)
  }

  // ── 5. Email domain ──
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  if (DISPOSABLE.has(domain)) {
    score += W.DISPOSABLE_EMAIL
    reasons.push(`Disposable email domain: ${domain}`)
  } else if (PRIVACY.has(domain)) {
    score += W.PRIVACY_EMAIL
    reasons.push(`Privacy/anonymous email domain: ${domain}`)
  }

  // ── 6. Behavioral biometrics ──
  if (behavior && behavior.typingSpeed.length >= 5) {
    const sim = await behaviorSimilarity(behavior)
    details.behaviorSimilarity = sim
    if (sim >= 85) {
      score += W.BEHAVIOR_MATCH
      reasons.push(`Typing behavior ${sim}% similar to known fraud pattern`)
    } else if (sim >= 65) {
      score += Math.floor(W.BEHAVIOR_MATCH / 2)
      reasons.push(`Behavioral pattern partially matches fraud profile (${sim}%)`)
    }
  }

  score = Math.min(100, Math.max(0, score))
  const riskLevel = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : score >= 20 ? 'low' : 'safe'
  const blocked = score >= 70 || details.torDetected

  return { userId, riskScore: score, riskLevel, blocked, reasons, details }
}

async function behaviorSimilarity(behavior: BehaviorData): Promise<number> {
  const { data } = await supabaseAdmin
    .from('behavior_profiles').select('typing_speed_avg,keystroke_dwell_avg')
    .eq('is_fraud', true).limit(50)
  if (!data || data.length === 0) return 0
  const userTyping = avg(behavior.typingSpeed)
  const userDwell = avg(behavior.keystrokeDwells)
  let max = 0
  for (const p of data) {
    const td = Math.abs(userTyping - p.typing_speed_avg) / Math.max(userTyping, 1)
    const dd = Math.abs(userDwell - p.keystroke_dwell_avg) / Math.max(userDwell, 1)
    const sim = Math.max(0, 100 - ((td + dd) / 2) * 100)
    if (sim > max) max = sim
  }
  return Math.round(max)
}

const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

export async function persistFraudResult(params: {
  userId: string; email: string; result: FraudCheckResult
  ipInfo: IPInfo; fingerprint: DeviceFingerprint; behavior?: BehaviorData
}) {
  const { userId, email, result, ipInfo, fingerprint, behavior } = params

  await supabaseAdmin.from('users').update({
    risk_score: result.riskScore, risk_level: result.riskLevel,
    blocked: result.blocked, vpn_detected: result.details.vpnDetected,
    tor_detected: result.details.torDetected, linked_accounts: result.details.linkedAccounts,
    fraud_reasons: result.reasons, ip_address: ipInfo.ip, country: ipInfo.country,
    last_seen: new Date().toISOString(),
  }).eq('id', userId)

  await supabaseAdmin.from('fraud_logs').insert({
    user_id: userId, email, fraud_score: result.riskScore, risk_level: result.riskLevel,
    reasons: result.reasons, blocked: result.blocked,
    action: result.blocked ? 'blocked' : result.riskScore >= 40 ? 'flagged' : 'allowed',
    ip_address: ipInfo.ip, country: ipInfo.country, device_hash: fingerprint.hash,
  })

  await supabaseAdmin.from('device_fingerprints').upsert({
    user_id: userId, fingerprint_hash: fingerprint.hash,
    canvas_hash: fingerprint.canvasHash, audio_hash: fingerprint.audioHash,
    fonts_hash: fingerprint.fontsHash, browser_name: fingerprint.browserName,
    browser_version: fingerprint.browserVersion, os_name: fingerprint.osName,
    os_version: fingerprint.osVersion, screen_resolution: fingerprint.screenResolution,
    timezone: fingerprint.timezone, cpu_cores: fingerprint.cpuCores,
    webgl_renderer: fingerprint.webglRenderer, webgl_vendor: fingerprint.webglVendor,
    touch_support: fingerprint.touchSupport, language: fingerprint.language,
    color_depth: fingerprint.colorDepth, device_memory: fingerprint.deviceMemory,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (behavior && behavior.typingSpeed.length > 0) {
    await supabaseAdmin.from('behavior_profiles').upsert({
      user_id: userId, typing_speed_avg: avg(behavior.typingSpeed),
      keystroke_dwell_avg: avg(behavior.keystrokeDwells), scroll_depth: behavior.scrollDepth,
      session_duration: behavior.sessionDuration, click_count: behavior.clickCount,
      is_fraud: result.blocked, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }
}
