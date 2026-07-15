import 'server-only'

import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

const COLLECT_ENDPOINT = 'https://www.google-analytics.com/mp/collect'
const SEND_TIMEOUT_MS = 2_000

export type Ga4Event = {
  name: string
  params: Record<string, string | number | boolean>
}

export function isGa4Configured(): boolean {
  return !!(process.env.GA4_MEASUREMENT_ID && process.env.GA4_API_SECRET)
}

// _ga looks like `GA1.1.1247869242.1718123456`; the client_id is the trailing
// `<random>.<first-visit-timestamp>` pair.
export function parseGaClientId(
  cookieValue: string | undefined
): string | null {
  const segments = cookieValue?.split('.') ?? []
  if (segments.length < 4) return null

  const clientId = segments.slice(-2).join('.')
  return /^\d+\.\d+$/.test(clientId) ? clientId : null
}

export function gaSessionCookieName(measurementId: string): string {
  return `_ga_${measurementId.replace(/^G-/, '')}`
}

// The per-stream cookie carries the session id in its third dot-segment:
// `GS1.1.1718123456.5...` (legacy) or `GS2.1.s1718123456$o5...` (current).
export function parseGaSessionId(
  cookieValue: string | undefined
): string | null {
  if (!cookieValue?.startsWith('GS')) return null

  const match = cookieValue.split('.')[2]?.match(/^s?(\d+)/)
  return match?.[1] ?? null
}

export async function sendGa4Event(
  clientId: string,
  event: Ga4Event
): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID
  const apiSecret = process.env.GA4_API_SECRET
  if (!measurementId || !apiSecret) return

  const url = `${COLLECT_ENDPOINT}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`
  const params =
    process.env.VERCEL_ENV === 'production'
      ? event.params
      : { ...event.params, debug_mode: true }

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        events: [{ name: event.name, params }],
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      opentelemetry: { ignore: true },
    })

    if (!response.ok) {
      l.warn(
        {
          key: 'ga4:send_event_failed',
          context: { event: event.name, status: response.status },
        },
        'GA4 Measurement Protocol returned a non-2xx status'
      )
    }
  } catch (error) {
    l.warn(
      {
        key: 'ga4:send_event_failed',
        context: { event: event.name },
        error: serializeErrorForLog(error),
      },
      'GA4 Measurement Protocol request failed'
    )
  }
}
