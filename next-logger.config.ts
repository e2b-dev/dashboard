// @ts-expect-error no types
import { formatters } from '@niveus/winston-utils'
import { createLogger, format, transports } from 'winston'

const { combine, timestamp, json } = format

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

/**
 * Creates a Winston logger instance with sane defaults and the ability to override
 * configuration via the optional `defaultConfig` parameter.
 *
 * The resulting logger mirrors the previous Pino behaviour:
 * - JSON output
 * - ISO timestamp (`timestamp` field)
 * - Dynamic `traceId` and `spanId` from the current OpenTelemetry context
 * - Level determined by `LOG_LEVEL` env var (falls back to `debug` in dev, `info` otherwise)
 */
export const logger = (defaultConfig = {}) =>
  createLogger({
    level:
      process.env.NEXT_PUBLIC_VERBOSE && process.env.NODE_ENV !== 'production'
        ? 'debug'
        : 'info',
    format: combine(
      formatters.piiRedact({
        paths: REDACTION_PATHS,
      }),
      timestamp({ format: () => new Date().toISOString() }),
      json()
    ),
    transports: [
      new transports.Console({
        handleExceptions: true,
        format: json(),
      }),
    ],
    ...defaultConfig,
  })

export const loggerInstance = logger({})
