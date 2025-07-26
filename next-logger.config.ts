/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
import { context, trace } from '@opentelemetry/api'
import pino from 'pino'
import pinoLoki from 'pino-loki'

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

// Decide the default log level the same way we did before.
const isDebug =
  process.env.NEXT_PUBLIC_VERBOSE && process.env.NODE_ENV !== 'production'

// Common logger options shared by every instance we create.
const baseOptions = {
  level: isDebug ? 'debug' : 'info',
  // fast-redact config consumed by pino internals.
  redact: {
    paths: REDACTION_PATHS,
    censor: '[Redacted]',
  },
  // Use ISO timestamps to stay compatible with existing log processing.
  timestamp: pino.stdTimeFunctions.isoTime,
  // Inject OpenTelemetry span / trace ids if present in the context.
  mixin() {
    const span = trace.getSpan(context.active())
    if (span) {
      const { traceId, spanId } = span.spanContext()
      return { traceId, spanId }
    }
    return {}
  },
}

// Build the list of streams (console + optional Loki).
const streams = [{ stream: process.stdout }]

if (process.env.LOKI_HOST) {
  streams.push({
    stream: pinoLoki({
      host: process.env.LOKI_HOST,
      labels: {
        env: process.env.NODE_ENV || 'development',
        service: process.env.SERVICE_NAME || 'e2b-dashboard',
      },
      json: true,
      replaceTimestamp: true,
      onConnectionError(err) {
        // eslint-disable-next-line no-console
        console.error(err)
      },
    }),
  })
}

// Factory that mirrors the old `logger` helper but returns pino instances.
const logger = (config = {}) =>
  pino({ ...baseOptions, ...config }, pino.multistream(streams))

// Main singleton that the rest of the codebase imports.
const loggerInstance = logger({})

module.exports = {
  logger,
  loggerInstance,
  REDACTION_PATHS,
}
