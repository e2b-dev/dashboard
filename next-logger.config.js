/* eslint-disable @typescript-eslint/no-require-imports */
const { createLogger, transports, format } = require('winston')
const { context, trace } = require('@opentelemetry/api')
const { piiRedact } = require('@niveus/winston-utils').formatters

const { combine, timestamp, json } = format

const traceFormat = format((info) => {
  const span = trace.getSpan(context.active())
  if (span) {
    const { traceId, spanId } = span.spanContext()
    info.traceId = traceId
    info.spanId = spanId
  }
  return info
})

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
const logger = (defaultConfig = {}) =>
  createLogger({
    level:
      process.env.NEXT_PUBLIC_VERBOSE && process.env.NODE_ENV !== 'production'
        ? 'debug'
        : 'info',
    format: combine(
      piiRedact({
        paths: REDACTION_PATHS,
      }),
      timestamp({ format: () => new Date().toISOString() }),
      traceFormat(),
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

const loggerInstance = logger({})

module.exports = {
  logger,
  loggerInstance,
  REDACTION_PATHS,
}
