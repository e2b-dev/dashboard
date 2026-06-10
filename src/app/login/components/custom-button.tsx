'use client'

import { FlowType } from '@ory/client-fetch'
import type { OryNodeButtonProps } from '@ory/elements-react'
import { useOryFlow } from '@ory/elements-react'
import { Button } from '@/ui/primitives/button'

// Renders Ory button nodes (e.g. the "Sign in" / "Sign up" submit) with the
// dashboard's primary <Button>. `buttonProps` carries
// type/name/value/onClick/disabled.
export function OryButton({
  node,
  buttonProps,
  isSubmitting,
}: OryNodeButtonProps) {
  const { flowType } = useOryFlow()
  const label = node.meta?.label?.text
  const loadingLabel =
    flowType === FlowType.Registration ? 'Signing up…' : 'Signing in…'

  return (
    <Button {...buttonProps} loading={isSubmitting ? loadingLabel : undefined}>
      {label}
    </Button>
  )
}
