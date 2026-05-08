'use client'
import { useEffect, useRef, useState } from 'react'
import type { DeviceFingerprint } from '@/types'

// Simple FNV-1a hash for combining signals
function fnv1a(str: string): string {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

function getCanvasHash(): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 200; canvas.height = 50
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 200, 50)
    ctx.fillStyle = '#069'
    ctx.font = '14px Arial'
    ctx.fillText('CredShield🛡️Γ☯', 2, 15)
    ctx.strokeStyle = 'rgba(102,204,0,0.7)'
    ctx.beginPath(); ctx.arc(50, 40, 20, 0, Math.PI * 2); ctx.stroke()
    return fnv1a(canvas.toDataURL())
  } catch { return 'unsupported' }
}

async function getAudioHash(): Promise<string> {
  try {
    const ctx = new OfflineAudioContext(1, 4096, 44100)
    const oscillator = ctx.createOscillator()
    const compressor = ctx.createDynamicsCompressor()
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(10000, ctx.currentTime)
    compressor.threshold.setValueAtTime(-50, ctx.currentTime)
    compressor.knee.setValueAtTime(40, ctx.currentTime)
    compressor.ratio.setValueAtTime(12, ctx.currentTime)
    compressor.attack.setValueAtTime(0, ctx.currentTime)
    compressor.release.setValueAtTime(0.25, ctx.currentTime)
    oscillator.connect(compressor)
    compressor.connect(ctx.destination)
    oscillator.start(0)
    const buffer = await ctx.startRendering()
    const data = buffer.getChannelData(0)
    let hash = 0
    for (let i = 0; i < data.length; i += 100) {
      hash += Math.abs(data[i])
    }
    return fnv1a(hash.toFixed(8))
  } catch { return 'unsupported' }
}

function getWebGLInfo(): { renderer: string; vendor: string } {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null
    if (!gl) return { renderer: 'unsupported', vendor: 'unsupported' }
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) return { renderer: gl.getParameter(gl.RENDERER), vendor: gl.getParameter(gl.VENDOR) }
    return {
      renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || 'unknown',
      vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || 'unknown',
    }
  } catch { return { renderer: 'error', vendor: 'error' } }
}

function getFontsHash(): string {
  const testFonts = ['Arial','Times New Roman','Courier New','Georgia','Verdana','Helvetica','Tahoma','Trebuchet MS','Impact','Comic Sans MS','Palatino','Garamond','Bookman','Avant Garde','Monaco','Consolas']
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const base = 'mmmmmmmmmmlli'
  ctx.font = '72px monospace'
  const baseWidth = ctx.measureText(base).width
  const present: string[] = []
  for (const font of testFonts) {
    ctx.font = `72px '${font}', monospace`
    if (ctx.measureText(base).width !== baseWidth) present.push(font)
  }
  return fnv1a(present.join(','))
}

export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function collect() {
      try {
        const { default: FingerprintJS } = await import('@fingerprintjs/fingerprintjs')
        const fp = await FingerprintJS.load()
        const result = await fp.get()

        const [audioHash, webgl] = await Promise.all([getAudioHash(), Promise.resolve(getWebGLInfo())])
        const canvasHash = getCanvasHash()
        const fontsHash = getFontsHash()

        const nav = navigator as any
        const ua = navigator.userAgent

        // Parse browser
        let browserName = 'Unknown', browserVersion = 'Unknown'
        if (/Edg\//.test(ua)) { browserName = 'Edge'; browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] ?? '' }
        else if (/Chrome\//.test(ua)) { browserName = 'Chrome'; browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] ?? '' }
        else if (/Firefox\//.test(ua)) { browserName = 'Firefox'; browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] ?? '' }
        else if (/Safari\//.test(ua)) { browserName = 'Safari'; browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] ?? '' }

        // Parse OS
        let osName = 'Unknown', osVersion = 'Unknown'
        if (/Windows NT/.test(ua)) { osName = 'Windows'; osVersion = ua.match(/Windows NT ([\d.]+)/)?.[1] ?? '' }
        else if (/Mac OS X/.test(ua)) { osName = 'macOS'; osVersion = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') ?? '' }
        else if (/Android/.test(ua)) { osName = 'Android'; osVersion = ua.match(/Android ([\d.]+)/)?.[1] ?? '' }
        else if (/iPhone|iPad/.test(ua)) { osName = 'iOS'; osVersion = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') ?? '' }
        else if (/Linux/.test(ua)) { osName = 'Linux'; osVersion = '' }

        const combined = [
          result.visitorId, canvasHash, audioHash, fontsHash,
          webgl.renderer, webgl.vendor, screen.width, screen.height,
          navigator.hardwareConcurrency, navigator.language, new Date().getTimezoneOffset()
        ].join('|')

        const hash = fnv1a(combined) + fnv1a(combined.split('').reverse().join(''))

        setFingerprint({
          hash,
          browserName, browserVersion,
          osName, osVersion,
          screenResolution: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          cpuCores: navigator.hardwareConcurrency ?? 0,
          canvasHash, audioHash, fontsHash,
          webglRenderer: webgl.renderer,
          webglVendor: webgl.vendor,
          touchSupport: navigator.maxTouchPoints > 0,
          language: navigator.language,
          colorDepth: screen.colorDepth,
          deviceMemory: (nav.deviceMemory ?? 0),
        })
      } catch (e) {
        console.error('Fingerprint error:', e)
      } finally {
        setLoading(false)
      }
    }
    collect()
  }, [])

  return { fingerprint, loading }
}
