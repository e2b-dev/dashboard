/**
 * Universal logger that picks the correct implementation for the current runtime
 * (Node, Edge, Browser) and exposes an API compatible with `pino`.
 *
 * In Node & Browser we return the real pino instance.
 * In Edge we fall back to the minimal JSON logger implemented in `logger.edge.ts`.
 */

import pino, { Logger } from 'pino'
import { ErrorObject } from 'serialize-error'

/**
 * Represents platform-specific metadata that can be included in logs.
 * These are top-level properties that provide structured metadata for log filtering and analysis.
 */
interface PlatformContextKeys {
  /** Identifier for the team */
  team_id?: string
  /** Identifier for the user */
  user_id?: string
  /** Identifier for the sandbox */

  sandbox_id?: string
  /** Identifier for the template */
  template_id?: string
}

/**
 * Context data structure for logging entries.
 * Extends platform-specific metadata with additional fields.
 */
interface ILoggerContext extends Record<string, unknown>, PlatformContextKeys {
  /** Key to help identify log entry in-code */
  key: string

  /** Should contain Error */
  error?: ErrorObject | unknown

  /** Should contain context around the log */
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
