'use client'

import { usePathname } from 'next/navigation'
import { usePostHog } from 'posthog-js/react'
import { useCallback, useEffect, useRef } from 'react'

const POSTHOG_IDENTIFIED_USER_KEY = 'e2b.posthog.identifiedUser'

type OryPostHogUser = {
  id: string
  email: string | null
}

type OryPublicSession = {
  user?: {
    id?: unknown
    email?: unknown
  }
}

type SessionState =
  | { status: 'authenticated'; user: OryPostHogUser }
  | { status: 'anonymous' }
  | { status: 'unknown' }

function getIdentitySignature(user: OryPostHogUser): string {
  return JSON.stringify({ id: user.id, email: user.email })
}

function readIdentifiedUserSignature(): string | null {
  try {
    return window.localStorage.getItem(POSTHOG_IDENTIFIED_USER_KEY)
  } catch {
    return null
  }
}

function persistIdentifiedUserSignature(signature: string | null) {
  try {
    if (signature) {
      window.localStorage.setItem(POSTHOG_IDENTIFIED_USER_KEY, signature)
    } else {
      window.localStorage.removeItem(POSTHOG_IDENTIFIED_USER_KEY)
    }
  } catch {}
}

function getUserFromSession(value: unknown): OryPostHogUser | null {
  if (!value || typeof value !== 'object') return null

  const session = value as OryPublicSession
  const id = session.user?.id
  if (typeof id !== 'string' || id.length === 0) return null

  const email = session.user?.email
  return {
    // Auth.js projects token.sub here. In Ory mode token.sub is the dashboard
    // user id from public.users, not the Kratos identity id.
    id,
    email: typeof email === 'string' && email.length > 0 ? email : null,
  }
}

async function fetchOrySession(signal?: AbortSignal): Promise<SessionState> {
  try {
    const response = await fetch('/api/auth/oauth/session', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal,
    })

    if (!response.ok) return { status: 'unknown' }

    const session = await response.json()
    const user = getUserFromSession(session)
    return user ? { status: 'authenticated', user } : { status: 'anonymous' }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { status: 'unknown' }
    }

    return { status: 'unknown' }
  }
}

export function resetOryPostHogIdentity(
  posthog: ReturnType<typeof usePostHog>
) {
  posthog.reset()
  persistIdentifiedUserSignature(null)
}

export function OryPostHogIdentityBridge() {
  const posthog = usePostHog()
  const pathname = usePathname()
  const lastSyncedPathname = useRef(pathname)

  const syncIdentity = useCallback(
    async (signal?: AbortSignal) => {
      const session = await fetchOrySession(signal)

      if (session.status === 'unknown') return

      if (session.status === 'anonymous') {
        if (readIdentifiedUserSignature()) resetOryPostHogIdentity(posthog)
        return
      }

      const signature = getIdentitySignature(session.user)
      if (readIdentifiedUserSignature() === signature) return

      posthog.identify(session.user.id, { email: session.user.email })
      persistIdentifiedUserSignature(signature)
    },
    [posthog]
  )

  useEffect(() => {
    const controller = new AbortController()
    void syncIdentity(controller.signal)
    return () => controller.abort()
  }, [syncIdentity])

  useEffect(() => {
    if (lastSyncedPathname.current === pathname) return

    lastSyncedPathname.current = pathname
    void syncIdentity()
  }, [pathname, syncIdentity])

  return null
}
