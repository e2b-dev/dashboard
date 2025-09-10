import { useEffect, useMemo, useState } from 'react'

// tailwind breakpoints
const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

type Breakpoint = keyof typeof BREAKPOINTS

interface BreakpointState {
  width: number
  breakpoint: Breakpoint
  isXs: boolean
  isSm: boolean
  isMd: boolean
  isLg: boolean
  isXl: boolean
  is2xl: boolean
  // helpers for "at least" checks
  isSmUp: boolean
  isMdUp: boolean
  isLgUp: boolean
  isXlUp: boolean
  is2xlUp: boolean
  // helpers for "at most" checks
  isSmDown: boolean
  isMdDown: boolean
  isLgDown: boolean
  isXlDown: boolean
}

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS['2xl']) return '2xl'
  if (width >= BREAKPOINTS.xl) return 'xl'
  if (width >= BREAKPOINTS.lg) return 'lg'
  if (width >= BREAKPOINTS.md) return 'md'
  if (width >= BREAKPOINTS.sm) return 'sm'
  return 'xs'
}

export function useBreakpoint(): BreakpointState {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.lg
  )

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth)
    }

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        setWidth(window.innerWidth)
      })
      resizeObserver.observe(document.documentElement)
      return () => resizeObserver.disconnect()
    } else {
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  const state = useMemo<BreakpointState>(() => {
    const breakpoint = getBreakpoint(width)

    return {
      width,
      breakpoint,
      // exact breakpoint checks
      isXs: breakpoint === 'xs',
      isSm: breakpoint === 'sm',
      isMd: breakpoint === 'md',
      isLg: breakpoint === 'lg',
      isXl: breakpoint === 'xl',
      is2xl: breakpoint === '2xl',
      // "at least" checks (mobile-first)
      isSmUp: width >= BREAKPOINTS.sm,
      isMdUp: width >= BREAKPOINTS.md,
      isLgUp: width >= BREAKPOINTS.lg,
      isXlUp: width >= BREAKPOINTS.xl,
      is2xlUp: width >= BREAKPOINTS['2xl'],
      // "at most" checks (desktop-first)
      isSmDown: width < BREAKPOINTS.md,
      isMdDown: width < BREAKPOINTS.lg,
      isLgDown: width < BREAKPOINTS.xl,
      isXlDown: width < BREAKPOINTS['2xl'],
    }
  }, [width])

  return state
}
