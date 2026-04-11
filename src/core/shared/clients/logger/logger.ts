import pino, { type Logger } from 'pino'
import { type ErrorObject, serializeError } from 'serialize-error'
import {
  formatRequestLogMessage,
  getRequestObservabilityContext,
} from './request-observability'

interface PlatformContextKeys {
  team_id?: string
  team_slug?: string
  user_id?: string
  sandbox_id?: string
  template_id?: string
  request_url?: string
  request_path?: string
  transport?: string
  handler_name?: string
}

interface ILoggerContext extends Record<string, unknown>, PlatformContextKeys {
  key: string
  error?: ErrorObject | unknown
  context?: Record<string, unknown>
}

interface ILogger {
  child(bindings: Record<string, unknown>): Logger
  fatal(context: ILoggerContext, message?: string, ...args: unknown[]): void
  error(context: ILoggerContext, message?: string, ...args: unknown[]): void
  warn(context: ILoggerContext, message?: string, ...args: unknown[]): void
  info(context: ILoggerContext, message?: string, ...args: unknown[]): void
  debug(context: ILoggerContext, message?: string, ...args: unknown[]): void
  trace(context: ILoggerContext, message?: string, ...args: unknown[]): void
}

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

const stripStackFields = (
  value: unknown,
  seen = new WeakSet<object>()
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => stripStackFields(item, seen))
  }

  if (typeof value !== 'object' || value === null) {
    return value
  }

  if (seen.has(value)) {
    return '[Circular]'
  }

  seen.add(value)

  const entries = Object.entries(value).filter(([key]) => key !== 'stack')

  return Object.fromEntries(
    entries.map(([key, item]) => [key, stripStackFields(item, seen)])
  )
}

export const serializeErrorForLog = (error: unknown): ErrorObject | unknown =>
  stripStackFields(serializeError(error)) as ErrorObject

function enrichLogContext(context: ILoggerContext): ILoggerContext {
  const requestContext = getRequestObservabilityContext()

  if (!requestContext) {
    return context
  }

  return {
    ...requestContext,
    ...context,
  }
}

const createLogger = () => {
  const baseConfig = {
    redact: {
      paths: REDACTION_PATHS,
      censor: '[Redacted]',
    },
    level: 'debug',
  }

  const baseLogger = pino(baseConfig)

  return {
    child(bindings: Record<string, unknown>) {
      return baseLogger.child(bindings)
    },
    fatal(context: ILoggerContext, message?: string, ...args: unknown[]) {
      const enrichedContext = enrichLogContext(context)
      baseLogger.fatal(
        enrichedContext,
        formatRequestLogMessage(message, enrichedContext),
        ...args
      )
    },
    error(context: ILoggerContext, message?: string, ...args: unknown[]) {
      const enrichedContext = enrichLogContext(context)
      baseLogger.error(
        enrichedContext,
        formatRequestLogMessage(message, enrichedContext),
        ...args
      )
    },
    warn(context: ILoggerContext, message?: string, ...args: unknown[]) {
      const enrichedContext = enrichLogContext(context)
      baseLogger.warn(
        enrichedContext,
        formatRequestLogMessage(message, enrichedContext),
        ...args
      )
    },
    info(context: ILoggerContext, message?: string, ...args: unknown[]) {
      const enrichedContext = enrichLogContext(context)
      baseLogger.info(
        enrichedContext,
        formatRequestLogMessage(message, enrichedContext),
        ...args
      )
    },
    debug(context: ILoggerContext, message?: string, ...args: unknown[]) {
      const enrichedContext = enrichLogContext(context)
      baseLogger.debug(
        enrichedContext,
        formatRequestLogMessage(message, enrichedContext),
        ...args
      )
    },
    trace(context: ILoggerContext, message?: string, ...args: unknown[]) {
      const enrichedContext = enrichLogContext(context)
      baseLogger.trace(
        enrichedContext,
        formatRequestLogMessage(message, enrichedContext),
        ...args
      )
    },
  } satisfies ILogger
}

export const logger: ILogger = createLogger()
export const l = logger
export default logger
