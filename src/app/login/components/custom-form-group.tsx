'use client'

import type { PropsWithChildren } from 'react'

export function OryFormGroup({ children }: PropsWithChildren) {
  return <div className="flex flex-col gap-4">{children}</div>
}
