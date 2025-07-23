'use client'

import { GTMBody } from '@/features/google-tag-manager'
import { cn } from '@/lib/utils'
import { useParams } from 'next/navigation'
import { type ReactNode } from 'react'

export function Body({
  children,
}: {
  children: ReactNode
}): React.ReactElement<unknown> {
  const mode = useMode()

  return (
    <body className={cn(mode, 'relative flex min-h-[100svh] flex-col')}>
      <GTMBody />
      {children}
    </body>
  )
}

export function useMode(): string | undefined {
  const { slug } = useParams()
  return Array.isArray(slug) && slug.length > 0 ? slug[0] : undefined
}
