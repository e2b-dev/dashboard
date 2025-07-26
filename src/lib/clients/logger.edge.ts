import type { Logger } from 'pino'

// Simple logger that wraps console methods for Edge and Browser environments.
// We only implement the methods we actually use and cast the result to Pino's `Logger`
// interface so that the rest of the codebase can depend on the `logger` shape without
// pulling the full Pino implementation into an edge bundle.

const logger = {
  debug: (...args: unknown[]) => {
    console.debug(...args)
    return logger
  },
  info: (...args: unknown[]) => {
    console.info(...args)
    return logger
  },
  warn: (...args: unknown[]) => {
    console.warn(...args)
    return logger
  },
  error: (...args: unknown[]) => {
    console.error(...args)
    return logger
  },
} as unknown as Logger

export { logger }
