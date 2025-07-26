import * as Sentry from '@sentry/nextjs'
import { registerOTel } from '@vercel/otel'
import type { Logger } from 'pino'

const REDACTION_PATHS = [
  'password',
  'confirmPassword',
  'accessToken',
  'secret',
  'token',
  'apiKey',
  'key',
  '*.*.password',
  '*.*.confirmPassword',
  '*.*.accessToken',
  '*.*.secret',
  '*.*.token',
  '*.*.apiKey',
  '*.*.key',
  '*.*.*.password',
  '*.*.*.confirmPassword',
  '*.*.*.accessToken',
  '*.*.*.secret',
  '*.*.*.token',
  '*.*.*.apiKey',
  '*.*.*.key',
]

interface LogFnParams {
  key: string
  message?: string
  context?: Record<string, string>
}

type AppLogger = Logger & {
  child: (...args: Parameters<Logger['child']>) => AppLogger

  info: (params: LogFnParams) => void
  warn: (params: LogFnParams) => void
  error: (params: LogFnParams) => void
  debug: (params: LogFnParams) => void
}

declare global {
  var logger: AppLogger | undefined
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

    const pino = (await import('pino')).default

    if (process.env.LOKI_HOST) {
      const pinoLoki = (await import('pino-loki')).default

      const transport = pinoLoki({
        host: process.env.LOKI_HOST,
        headers: {
          Authorization: `Basic ${process.env.LOKI_PASSWORD}`,
        },
        labels: {
          app: 'dashboard',
        },
      })

      const consoleDestination = pino.destination({
        sync: true,
        minLength: 100,
        json: true,
      })

      const logger = pino(transport)
      globalThis.logger = logger
      return
    }

    const logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      redact: {
        paths: REDACTION_PATHS,
        censor: '[Redacted]',
      },
    })
    globalThis.logger = logger
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
