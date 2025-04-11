'use client'

import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import ClientOnly from './client-only'

export default function Logo({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()

  const logo =
    resolvedTheme === 'dark'
      ? '/meta/logo-text-dark.svg'
      : '/meta/logo-text-light.svg'

  return (
    <ClientOnly>
      <img
        src={logo}
        alt="logo with text"
        className={cn('h-9 w-auto', className)}
        suppressHydrationWarning
      />
    </ClientOnly>
  )
}
