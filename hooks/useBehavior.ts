'use client'
import { useRef, useCallback } from 'react'
import type { BehaviorData } from '@/types'

export function useBehavior() {
  const startTime = useRef<number>(Date.now())
  const typingSpeed = useRef<number[]>([])
  const keystrokeDwells = useRef<number[]>([])
  const keystrokeFlights = useRef<number[]>([])
  const mouseMovements = useRef<{ x: number; y: number; t: number }[]>([])
  const clickCount = useRef<number>(0)
  const scrollDepth = useRef<number>(0)
  const lastKeyDown = useRef<number>(0)
  const lastKeyUp = useRef<number>(0)
  const keyDownTimes = useRef<Record<string, number>>({})

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const now = performance.now()
    keyDownTimes.current[e.key] = now
    if (lastKeyUp.current > 0) {
      keystrokeFlights.current.push(now - lastKeyUp.current)
    }
    if (lastKeyDown.current > 0) {
      const interval = now - lastKeyDown.current
      if (interval < 2000) typingSpeed.current.push(1000 / interval)
    }
    lastKeyDown.current = now
  }, [])

  const onKeyUp = useCallback((e: React.KeyboardEvent) => {
    const now = performance.now()
    const downTime = keyDownTimes.current[e.key]
    if (downTime) {
      keystrokeDwells.current.push(now - downTime)
      delete keyDownTimes.current[e.key]
    }
    lastKeyUp.current = now
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (mouseMovements.current.length < 200) {
      mouseMovements.current.push({ x: e.clientX, y: e.clientY, t: performance.now() })
    }
  }, [])

  const onClick = useCallback(() => { clickCount.current++ }, [])

  const onScroll = useCallback(() => {
    const depth = (window.scrollY + window.innerHeight) / document.body.scrollHeight
    if (depth > scrollDepth.current) scrollDepth.current = depth
  }, [])

  const getBehaviorData = useCallback((): BehaviorData => ({
    typingSpeed: [...typingSpeed.current],
    keystrokeDwells: [...keystrokeDwells.current],
    keystrokeFlights: [...keystrokeFlights.current],
    mouseMovements: [...mouseMovements.current],
    scrollDepth: scrollDepth.current,
    sessionDuration: Date.now() - startTime.current,
    clickCount: clickCount.current,
  }), [])

  return { onKeyDown, onKeyUp, onMouseMove, onClick, onScroll, getBehaviorData }
}
