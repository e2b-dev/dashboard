'use client'

import { FlowType } from '@ory/client-fetch'
import { useOryFlow } from '@ory/elements-react'
import Link from 'next/link'
import type { PropsWithChildren } from 'react'
import { AUTH_URLS } from '@/configs/urls'

export function OryCard({ children }: PropsWithChildren) {
  return <div className="bg-bg flex w-full flex-col border p-6">{children}</div>
}

// Cross-flow links point at the legacy /sign-in & /sign-up entry paths, which
// redirect to the same-origin Kratos flow pages (/login, /registration). Going
// through them keeps a single canonical entry point for each flow.
export function OryCardFooter() {
  const { flowType } = useOryFlow()

  if (flowType === FlowType.Login) {
    return (
      <p className="text-fg-secondary mt-6">
        Don't have an account?{' '}
        <Link href={AUTH_URLS.SIGN_UP} className="text-fg underline">
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
        <Link href={AUTH_URLS.SIGN_IN} className="text-fg underline">
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
        <Link href={AUTH_URLS.SIGN_IN} className="text-fg underline">
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
