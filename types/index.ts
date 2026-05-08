export interface DeviceFingerprint {
  hash: string
  browserName: string
  browserVersion: string
  osName: string
  osVersion: string
  screenResolution: string
  timezone: string
  cpuCores: number
  canvasHash: string
  audioHash: string
  fontsHash: string
  webglRenderer: string
  webglVendor: string
  touchSupport: boolean
  language: string
  colorDepth: number
  deviceMemory: number
}

export interface IPInfo {
  ip: string
  country: string
  region: string
  city: string
  org: string
  isVpn: boolean
  isTor: boolean
  isProxy: boolean
  isHosting: boolean
  threatScore: number
}

export interface BehaviorData {
  typingSpeed: number[]
  keystrokeDwells: number[]
  keystrokeFlights: number[]
  mouseMovements: { x: number; y: number; t: number }[]
  scrollDepth: number
  sessionDuration: number
  clickCount: number
}

export interface FraudCheckResult {
  userId: string
  riskScore: number
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  blocked: boolean
  reasons: string[]
  details: {
    deviceMatch: boolean
    vpnDetected: boolean
    torDetected: boolean
    behaviorSimilarity: number
    linkedAccounts: number
    ipReputation: 'clean' | 'suspicious' | 'malicious'
    registrationVelocity: number
  }
}

export interface UserRow {
  id: string
  email: string
  role: string
  risk_score: number
  risk_level: string
  blocked: boolean
  fraud_reasons: string[]
  ip_address: string
  country: string
  vpn_detected: boolean
  tor_detected: boolean
  fingerprint_hash: string
  linked_accounts: number
  credits_allocated: number
  credits_used: number
  created_at: string
  last_seen: string
}

export interface FraudLog {
  id: string
  user_id: string
  email: string
  fraud_score: number
  risk_level: string
  reasons: string[]
  blocked: boolean
  action: 'allowed' | 'flagged' | 'blocked'
  ip_address: string
  country: string
  device_hash: string
  created_at: string
}
