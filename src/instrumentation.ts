import * as Sentry from '@sentry/nextjs'
import { registerOTel } from '@vercel/otel'
import type { Logger } from 'pino'

declare global {
  var logger: Logger | undefined
}

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

    await import('pino')
    await import('pino-loki')
    // @ts-expect-error - incorrectly typed
    await import('next-logger')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
