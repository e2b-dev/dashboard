'use client'

import type { PropsWithChildren } from 'react'

// Card container (Card.Root). Replaces Ory's DefaultCard — the white, rounded,
// heavily-padded, fixed-480px surface — with the dashboard's compact bordered
// card. We no longer load Ory's theme stylesheet, so this is styled entirely
// with the dashboard's own classes.
export function OryCard({ children }: PropsWithChildren) {
  return (
    <div className="bg-bg flex w-full flex-col gap-6 border p-6">{children}</div>
  )
}

// Login is the only flow here and registration/recovery are disabled, so the
// default footer (provider-switch links) has nothing useful to show.
export function OryCardFooter() {
  return null
}
