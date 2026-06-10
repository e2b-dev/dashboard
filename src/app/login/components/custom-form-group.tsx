'use client'

import type { PropsWithChildren } from 'react'

// Layout for a group of form nodes (fields + submit). Owns the vertical rhythm
// between fields ourselves, since we no longer load Ory's theme stylesheet.
export function OryFormGroup({ children }: PropsWithChildren) {
  return <div className="flex flex-col gap-4">{children}</div>
}
