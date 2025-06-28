'use client'

import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import ClientOnly from './client-only'
import Image from 'next/image'

export default function LogoWithoutText({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()

  const logo =
    resolvedTheme === 'dark' ? '/meta/logo-dark.svg' : '/meta/logo-light.svg'

  return (
    <ClientOnly>
      <div className={cn('relative h-10 w-10', className)}>
        <Image
          key={`logo-without-text-${resolvedTheme}`}
          src={logo}
          alt="logo"
          fill
          className="object-contain"
          suppressHydrationWarning
        />
      </div>
    </ClientOnly>
  )
}
