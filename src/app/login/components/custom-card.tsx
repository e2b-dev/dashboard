'use client'

import { FlowType } from '@ory/client-fetch'
import { useOryFlow } from '@ory/elements-react'
import Link from 'next/link'
import type { PropsWithChildren } from 'react'
import { AUTH_URLS } from '@/configs/urls'

export function OryCard({ children }: PropsWithChildren) {
  return <div className="bg-bg flex w-full flex-col border p-6">{children}</div>
}

// Cross-flow links route through the legacy /sign-in & /sign-up start routes
// (→ /api/auth/oauth/start), not the raw flow pages: linking straight to
// /registration would drop the in-flight Hydra login_challenge and orphan the
// OAuth transaction. The start route re-establishes a valid one.
//
// They force a full top-level document navigation via target="_top" (and skip
// prefetch): the start route 307-redirects cross-origin to Hydra's /oauth2/auth.
// A soft navigation or hover prefetch would chase that redirect with fetch(),
// turning it into a CORS request the authorize endpoint rejects. target="_top"
// makes next/link fall back to a browser navigation, keeping the redirect chain
// top-level where it belongs.
export function OryCardFooter() {
  const { flowType } = useOryFlow()

  if (flowType === FlowType.Login) {
    return (
      <p className="text-fg-secondary mt-6">
        Don't have an account?{' '}
        <Link
          prefetch={false}
          target="_top"
          href={AUTH_URLS.SIGN_UP}
          className="text-fg underline"
        >
          Sign up
        </Link>
        .
      </p>
    )
  }

  // Recovery and verification have no sign-up/sign-in toggle of their own; give
  // users a way back to the login page.
  if (flowType === FlowType.Recovery || flowType === FlowType.Verification) {
    return (
      <p className="text-fg-secondary mt-6">
        Remember your password?{' '}
        <Link
          prefetch={false}
          target="_top"
          href={AUTH_URLS.SIGN_IN}
          className="text-fg underline"
        >
          Sign in
        </Link>
        .
      </p>
    )
  }

  if (flowType !== FlowType.Registration) {
    return null
  }

  return (
    <div className="text-fg-secondary mt-6 flex flex-col gap-4">
      <p>
        Already have an account?{' '}
        <Link
          prefetch={false}
          target="_top"
          href={AUTH_URLS.SIGN_IN}
          className="text-fg underline"
        >
          Sign in
        </Link>
        .
      </p>
      <p className="text-fg-tertiary">
        By signing up, you agree to our{' '}
        <Link
          href="/terms"
          target="_blank"
          className="text-fg-secondary underline"
        >
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link
          href="/privacy"
          target="_blank"
          className="text-fg-secondary underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
