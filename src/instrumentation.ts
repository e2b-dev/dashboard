import * as Sentry from '@sentry/nextjs'
import { registerOTel } from '@vercel/otel'
import type { Logger } from 'pino'

type AppLogFn = (params: { key: string, message?: string, error?: unknown, meta?: Record<string, unknown> }) => void

export type AppLogger = Omit<Logger, "info" | "warn" | "error" | "debug"> & {
  info: AppLogFn
  warn: AppLogFn
  error: AppLogFn
  debug: AppLogFn
}

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

    const logger = await (await import('./instrumentation-node')).register()
    globalThis.logger = logger
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
