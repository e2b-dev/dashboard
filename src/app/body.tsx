'use client'

import type { ReactNode } from 'react'

export function Body({
  children,
}: {
  children: ReactNode
}): React.ReactElement<unknown> {
  return (
    <body className="relative flex min-h-[100svh] flex-col">{children}</body>
  )
}
