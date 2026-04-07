import pino, { type Logger } from 'pino'
import { type ErrorObject, serializeError } from 'serialize-error'

interface PlatformContextKeys {
  team_id?: string
  user_id?: string
  sandbox_id?: string
  template_id?: string
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

const createLogger = () => {
  const baseConfig = {
    redact: {
      paths: REDACTION_PATHS,
      censor: '[Redacted]',
    },
    level: 'debug',
  }

  return pino(baseConfig)
}

export const logger: ILogger = createLogger()
export const l = logger
export default logger
