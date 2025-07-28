import { pino, Logger, LoggerOptions } from "pino"
import { context, trace } from '@opentelemetry/api'

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

export const createNodeLogger = async () => {
  const baseConfig: LoggerOptions = {
    redact: {
      paths: REDACTION_PATHS,
      censor: '[Redacted]',
    },
  }

  if (process.env.NEXT_RUNTIME === 'edge' || typeof process === 'undefined') {
    return pino(baseConfig)
  }

  if (process.env.LOKI_HOST) {
    try {
      const span = trace.getSpan(context.active())
      const spanContext = span?.spanContext()

      const transport = await pino.transport({
        targets: [
          {
            target: 'pino-loki',
            level: 'info',
            options: {
              labels: {
                app: process.env.SERVICE_NAME || "dashboard",
                service: process.env.OTEL_SERVICE_NAME || 'e2b-dashboard',
                env: process.env.NODE_ENV || 'development',
                ...(spanContext?.traceId && spanContext?.spanId ? {
                  traceId: spanContext.traceId,
                  spanId: spanContext.spanId,
                } : {}),
              },
              host: process.env.LOKI_HOST!,
              basicAuth: {
                username: process.env.LOKI_USERNAME!,
                password: process.env.LOKI_PASSWORD!,
              },
            },
          },
          {
            target: 'pino/file',
            level: 'info',
            options: {
              destination: 1,
            },
          }
        ],
      })

      const logger = pino(transport)
      return logger
    } catch (error) {
      console.error('Failed to create Loki transport, falling back to basic logger:', error)
      return pino(baseConfig)
    }
  }

  return pino(baseConfig)
}

export async function register(): Promise<Logger> {
  const logger = await createNodeLogger()

  globalThis.logger = logger
  return logger
}
