'use client'

import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function Logo({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const defaultClassName = 'h-9 w-auto'

  if (!isMounted) return <div className={cn(defaultClassName, className)} />

  const logo =
    resolvedTheme === 'dark'
      ? '/meta/logo-text-dark.svg'
      : '/meta/logo-text-light.svg'

  return (
    <img
      src={logo}
      alt="logo with text"
      className={cn(defaultClassName, className)}
      suppressHydrationWarning
    />
  )
}
