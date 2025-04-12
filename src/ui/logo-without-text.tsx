'use client'

import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import ClientOnly from './client-only'

export default function LogoWithoutText({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()

  const logo =
    resolvedTheme === 'dark' ? '/meta/logo-dark.svg' : '/meta/logo-light.svg'

  return (
    <ClientOnly>
      <img
        key={`logo-without-text-${resolvedTheme}`}
        src={logo}
        alt="logo"
        className={cn('h-10 w-10', className)}
        suppressHydrationWarning
      />
    </ClientOnly>
  )
}
