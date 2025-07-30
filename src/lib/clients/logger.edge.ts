import { VERBOSE } from '@/configs/flags'
import { Logger } from 'pino'

// Simple logger that wraps console methods for Edge and Browser environments.
// We only implement the methods we actually use and cast the result to Pino's `Logger`
// interface so that the rest of the codebase can depend on the `logger` shape without
// pulling the full Pino implementation into an edge bundle.

const logger: Logger = {
  debug: (...args: unknown[]) => VERBOSE && console.info(...args),
  info: console.info,
  warn: console.warn,
  error: console.error,
} as unknown as Logger

export { logger }
