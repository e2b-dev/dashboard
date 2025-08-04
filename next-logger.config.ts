import { VERBOSE } from '@/configs/flags'
import { trace } from '@opentelemetry/api'
import { LoggerOptions, pino } from 'pino'

const REDACTION_PATHS = [
  'password',
  'confirmPassword',
  'accessToken',
  'secret',
  'token',
  'apiKey',
  '*.password',
  '*.confirmPassword',
  '*.accessToken',
  '*.secret',
  '*.token',
  '*.apiKey',
  '*.key',
  '*.sandboxIds',
  '*.*.password',
  '*.*.confirmPassword',
  '*.*.accessToken',
  '*.*.secret',
  '*.*.token',
  '*.*.apiKey',
  '*.*.key',
]
const createLogger = () => {
  const baseConfig = (additionalTargets?: any[]): LoggerOptions => {
    return {
      redact: {
        paths: REDACTION_PATHS,
        censor: '[Redacted]',
      },
      formatters: {
        log: (logObject: any) => {
          const s = trace.getActiveSpan()
          return {
            ...logObject,
            trace_id: s?.spanContext().traceId,
            span_id: s?.spanContext().spanId,
          }
        },
      },
      transport: {
        targets: [
          {
            target: 'pino/file',
            level: VERBOSE ? 'debug' : 'info',
            options: {
              destination: 1,
            },
          },
          ...(additionalTargets || []),
        ],
      },
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge' || typeof process === 'undefined') {
    return pino(baseConfig())
  }

  if (process.env.LOKI_HOST) {
    try {
      const logger = pino(
        baseConfig([
          {
            target: 'pino-loki',
            level: VERBOSE ? 'debug' : 'info',
            options: {
              batching: true,
              interval: 5,
              labels: {
                service_name: process.env.LOKI_SERVICE_NAME || 'e2b-dashboard',
                env: process.env.NODE_ENV || 'development',
                vercel_env: process.env.VERCEL_ENV || undefined,
                vercel_url: process.env.VERCEL_URL || undefined,
                vercel_branch_url: process.env.VERCEL_BRANCH_URL || undefined,
                vercel_project_production_url:
                  process.env.VERCEL_PROJECT_PRODUCTION_URL || undefined,
              },
              host: process.env.LOKI_HOST,
              basicAuth: {
                username: process.env.LOKI_USERNAME,
                password: process.env.LOKI_PASSWORD,
              },
              convertArrays: true,
            },
          },
        ])
      )

      return logger
    } catch (error) {
      console.error(
        'Failed to create Loki transport, falling back to basic logger:',
        error
      )
      return pino(baseConfig())
    }
  }

  return pino(baseConfig())
}

const logger = createLogger()

export { logger }
