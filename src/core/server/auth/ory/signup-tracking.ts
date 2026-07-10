import 'server-only'

import { after } from 'next/server'
import {
  type Ga4Event,
  gaSessionCookieName,
  generateFallbackGaClientId,
  isGa4Configured,
  parseGaClientId,
  parseGaSessionId,
  sendGa4Event,
} from '@/core/shared/clients/ga4/measurement-protocol.server'
import { l } from '@/core/shared/clients/logger/logger'

const GA_CLIENT_COOKIE = '_ga'

type CookieReader = {
  get(name: string): { value: string } | undefined
}

type TrackOrySignUpInput = {
  cookies: CookieReader
  method: string | null
}

// Emits the GA4 sign_up key event for a freshly bootstrapped account. The
// payload is built eagerly — request cookies are not readable once the
// response has been sent — and delivered via after() so the signup redirect
// never waits on Google.
export function trackOrySignUpEvent(input: TrackOrySignUpInput): void {
  if (!isGa4Configured()) return

  const gaClientId = parseGaClientId(input.cookies.get(GA_CLIENT_COOKIE)?.value)
  const event = buildSignUpEvent(input)

  // Reconciliation anchor: compare counts of this log line against GA4 to
  // quantify drift from re-bootstrapped returning users (see callback route).
  l.info(
    {
      key: 'oauth_callback:sign_up_tracked',
      context: {
        attributed: !!gaClientId,
        method: input.method ?? 'unknown',
      },
    },
    'Queued GA4 sign_up event for newly bootstrapped user'
  )

  after(() => sendGa4Event(gaClientId ?? generateFallbackGaClientId(), event))
}

function buildSignUpEvent(input: TrackOrySignUpInput): Ga4Event {
  const measurementId = process.env.GA4_MEASUREMENT_ID
  const sessionId = measurementId
    ? parseGaSessionId(
        input.cookies.get(gaSessionCookieName(measurementId))?.value
      )
    : null

  return {
    name: 'sign_up',
    params: {
      // Events without engagement time are dropped from several GA4 reports.
      engagement_time_msec: 1,
      ...(sessionId ? { session_id: sessionId } : {}),
      ...(input.method ? { method: input.method } : {}),
    },
  }
}
