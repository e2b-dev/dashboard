'use client'

import type { OryNodeButtonProps } from '@ory/elements-react'
import { Button } from '@/ui/primitives/button'

// Renders Ory button nodes (e.g. the "Sign in" submit) with the dashboard's
// primary <Button>. `buttonProps` carries type/name/value/onClick/disabled.
export function OryButton({
  node,
  buttonProps,
  isSubmitting,
}: OryNodeButtonProps) {
  const label = node.meta?.label?.text

  return (
    <Button {...buttonProps} loading={isSubmitting ? 'Signing in…' : undefined}>
      {label}
    </Button>
  )
}
