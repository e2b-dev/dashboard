'use client'

import type { OryNodeSsoButtonProps } from '@ory/elements-react'
import type { ComponentType } from 'react'
import { GitHubLogo, GoogleLogo } from '@/features/auth/logos'
import { Button } from '@/ui/primitives/button'

// Known OIDC providers get a branded logo and a "Continue with …" label. Other
// providers fall back to whatever label Ory supplies, with no logo.
const PROVIDERS: Record<string, { label: string; Logo: ComponentType }> = {
  google: { label: 'Continue with Google', Logo: GoogleLogo },
  github: { label: 'Continue with GitHub', Logo: GitHubLogo },
}

// Social/SSO buttons ("Continue with …"), styled as the dashboard's secondary
// button. Only rendered when Kratos has OIDC providers enabled (the local
// harness disables OIDC, so this is dormant there).
export function OrySsoButton({
  node,
  provider,
  buttonProps,
  isSubmitting,
}: OryNodeSsoButtonProps) {
  const known = PROVIDERS[provider]
  const label = known?.label ?? node.meta?.label?.text
  const Logo = known?.Logo

  return (
    <Button
      variant="secondary"
      className="flex items-center gap-2"
      {...buttonProps}
      loading={isSubmitting ? 'Redirecting…' : undefined}
    >
      {Logo && <Logo />}
      {label}
    </Button>
  )
}
