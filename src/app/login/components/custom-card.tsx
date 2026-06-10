'use client'

import { FlowType } from '@ory/client-fetch'
import { useOryFlow } from '@ory/elements-react'
import Link from 'next/link'
import type { PropsWithChildren } from 'react'

// Card container (Card.Root). Replaces Ory's DefaultCard — the white, rounded,
// heavily-padded, fixed-480px surface — with the dashboard's compact bordered
// card. We no longer load Ory's theme stylesheet, so this is styled entirely
// with the dashboard's own classes.
export function OryCard({ children }: PropsWithChildren) {
  return <div className="bg-bg flex w-full flex-col border p-6">{children}</div>
}

// Card footer, shared by the login and registration flows. Login shows the
// "Sign up" cross-link; registration shows the "Sign in" cross-link plus the
// legal copy from the mockup. The card sets no flex `gap`, so the footer owns
// its own top margin.
export function OryCardFooter() {
  const { flowType } = useOryFlow()

  if (flowType === FlowType.Login) {
    return (
      <p className="text-fg-secondary mt-6">
        Don't have an account?{' '}
        <Link href="/register" className="text-fg underline">
          Sign up
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
        <Link href="/login" className="text-fg underline">
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
