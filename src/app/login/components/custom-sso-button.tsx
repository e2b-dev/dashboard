'use client'

import type { OryNodeSsoButtonProps } from '@ory/elements-react'
import { Button } from '@/ui/primitives/button'

// Social/SSO buttons ("Continue with …"), styled as the dashboard's secondary
// button. Only rendered when Kratos has OIDC providers enabled (the local
// harness disables OIDC, so this is dormant there).
export function OrySsoButton({
  node,
  buttonProps,
  isSubmitting,
}: OryNodeSsoButtonProps) {
  const label = node.meta?.label?.text

  return (
    <Button
      variant="secondary"
      {...buttonProps}
      loading={isSubmitting ? 'Redirecting…' : undefined}
    >
      {label}
    </Button>
  )
}
