'use client'

import { useEffect, useRef } from 'react'
import { signInWithOryAction } from '@/core/server/actions/ory-auth-actions'

interface OryHostedAuthRedirectProps {
  returnTo?: string
}

export function OryHostedAuthRedirect({
  returnTo,
}: OryHostedAuthRedirectProps) {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    formRef.current?.requestSubmit()
  }, [])

  return (
    <div className="flex w-full flex-col">
      <h1>Redirecting…</h1>
      <p className="text-fg-secondary leading-6">
        Hold on while we send you to the sign-in page.
      </p>
      <form ref={formRef} action={signInWithOryAction} className="mt-4">
        <input type="hidden" name="returnTo" value={returnTo ?? '/dashboard'} />
        <button
          type="submit"
          className="text-fg underline underline-offset-[3px]"
        >
          Continue if you are not redirected automatically
        </button>
      </form>
    </div>
  )
}
