import * as Sentry from '@sentry/nextjs'
import { registerOTel } from '@vercel/otel'

export async function register() {
  registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME || 'e2b-dashboard',
    instrumentationConfig: {
      fetch: {
        propagateContextUrls: [],
      },
    },
  })

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
    await import('winston')
    // @ts-expect-error no types
    await import('next-logger')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
