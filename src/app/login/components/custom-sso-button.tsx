'use client'

import type { OryNodeSsoButtonProps } from '@ory/elements-react'
import type { ComponentType, SVGProps } from 'react'
import { Google } from '@/components/ui/svgs/google'
import { Button } from '@/ui/primitives/button'

const PROVIDERS: Record<
  string,
  { label: string; Logo: ComponentType<SVGProps<SVGSVGElement>> }
> = {
  google: { label: 'Continue with Google', Logo: Google },
}

// Ory's `provider` prop is the label *context* (a display name like "Google"),
// not a stable id — the id is on `node.attributes.value`. Match leniently across
// id, prop, and label text so casing / naming can't cause a miss.
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
