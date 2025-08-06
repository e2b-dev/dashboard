'use client'

import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

export default function LogoWithoutText({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()

  const logo =
    resolvedTheme === 'dark' ? '/meta/logo-dark.svg' : '/meta/logo-light.svg'

  return (
    <img
      key={`logo-without-text-${resolvedTheme}`}
      src={logo}
      alt="logo"
      className={cn('h-10 w-10', className)}
      suppressHydrationWarning
    />
  )
}
