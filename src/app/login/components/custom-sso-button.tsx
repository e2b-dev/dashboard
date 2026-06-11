'use client'

import type { OryNodeSsoButtonProps } from '@ory/elements-react'
import type { ComponentType, SVGProps } from 'react'
import { Google } from '@/components/ui/svgs/google'
import { Button } from '@/ui/primitives/button'

// Known OIDC providers get a branded logo and a "Continue with …" label. Other
// providers fall back to whatever label Ory supplies, with no logo.
const PROVIDERS: Record<
  string,
  { label: string; Logo: ComponentType<SVGProps<SVGSVGElement>> }
> = {
  google: { label: 'Continue with Google', Logo: Google },
}

// The `provider` prop Ory passes comes from the node's label *context*, which
// Kratos sets to the provider's human-facing label (e.g. "Google"), not a
// stable lowercase id. The configured id lives on `node.attributes.value`. Match
// leniently across the id, the prop, and the label text so casing / id naming
// can't cause a miss.
function resolveProvider({
  node,
  provider,
}: Pick<OryNodeSsoButtonProps, 'node' | 'provider'>) {
  const haystack = [
    typeof node.attributes.value === 'string' ? node.attributes.value : '',
    provider,
    node.meta?.label?.text ?? '',
  ]
    .join(' ')
    .toLowerCase()

  if (haystack.includes('google')) return PROVIDERS.google
  return undefined
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
  const known = resolveProvider({ node, provider })
  const label = known?.label ?? node.meta?.label?.text
  const Logo = known?.Logo

  return (
    <Button
      variant="secondary"
      className="flex items-center gap-2"
      {...buttonProps}
      loading={isSubmitting ? 'Redirecting…' : undefined}
    >
      {Logo && (
        <Logo className="h-5 w-5" aria-hidden="true" focusable="false" />
      )}
      {label}
    </Button>
  )
}
