'use client'

import { FlowType } from '@ory/client-fetch'
import { useOryFlow } from '@ory/elements-react'
import Link from 'next/link'
import type { PropsWithChildren } from 'react'
import { AUTH_URLS } from '@/configs/urls'
import { getReauthInfo } from './reauth'

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
  const oryFlow = useOryFlow()
  const { flowType } = oryFlow

  if (flowType === FlowType.Login) {
    const { flow } = oryFlow

    // The reauth screen is pinned to the current identity; "Sign up" is noise
    // there. Offer only the escape hatch — logging out drops the pinned session
    // and lands on a clean sign-in (see the switch-account route).
    if (getReauthInfo(oryFlow).isReauthLogin) {
      return (
        <p className="text-fg-secondary mt-6">
          Something isn't working?{' '}
          <Link
            prefetch={false}
            target="_top"
            href={switchAccountHref(flow.return_to)}
            className="text-fg underline"
          >
            Logout
          </Link>
        </p>
      )
    }

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

// The switch-account route 307s into the OAuth start route, so it needs a
// relative returnTo (its `normalizeOryReturnTo` rejects absolute URLs). Reduce
// the flow's stored return_to to a path without relying on `window`, so this
// stays correct during SSR of the client component.
function switchAccountHref(returnTo?: string): string {
  const relative = toRelativeReturnTo(returnTo)
  return relative
    ? `${AUTH_URLS.SWITCH_ACCOUNT}?returnTo=${encodeURIComponent(relative)}`
    : AUTH_URLS.SWITCH_ACCOUNT
}

function toRelativeReturnTo(returnTo?: string): string | undefined {
  if (!returnTo) return undefined
  try {
    const url = new URL(returnTo, 'http://relative.invalid')
    const path = `${url.pathname}${url.search}`
    return path.startsWith('/') ? path : undefined
  } catch {
    return undefined
  }
}
