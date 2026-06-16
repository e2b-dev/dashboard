'use client'

import type { OryNodeSsoButtonProps } from '@ory/elements-react'
import type { ComponentType, SVGProps } from 'react'
import { GithubDark } from '@/components/ui/svgs/githubDark'
import { GithubLight } from '@/components/ui/svgs/githubLight'
import { Google } from '@/components/ui/svgs/google'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'

// GitHub's mark is monochrome, so swap the dark/light variants per theme. The
// `Google` SVG is full-color and needs no theme switch.
function GitHubLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <>
      <GithubLight className={cn('dark:hidden', className)} {...props} />
      <GithubDark className={cn('hidden dark:block', className)} {...props} />
    </>
  )
}

const PROVIDERS: Record<
  string,
  { label: string; Logo: ComponentType<SVGProps<SVGSVGElement>> }
> = {
  github: { label: 'Continue with GitHub', Logo: GitHubLogo },
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

  if (haystack.includes('github')) return PROVIDERS.github
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
