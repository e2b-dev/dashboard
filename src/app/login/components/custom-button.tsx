'use client'

import { FlowType } from '@ory/client-fetch'
import type { OryNodeButtonProps } from '@ory/elements-react'
import { useOryFlow } from '@ory/elements-react'
import { Button } from '@/ui/primitives/button'

export function OryButton({
  node,
  buttonProps,
  isSubmitting,
}: OryNodeButtonProps) {
  const { flowType } = useOryFlow()
  const label = node.meta?.label?.text
  const loadingLabel =
    flowType === FlowType.Registration
      ? 'Signing up…'
      : flowType === FlowType.Settings
        ? 'Saving…'
        : 'Signing in…'

  return (
    <Button {...buttonProps} loading={isSubmitting ? loadingLabel : undefined}>
      {label}
    </Button>
  )
}
