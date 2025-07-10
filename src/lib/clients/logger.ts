/**
 * Universal logger that picks the correct implementation for the current runtime
 * (Node, Edge, Browser) and exposes an API compatible with `pino`.
 *
 * In Node & Browser we return the real pino instance.
 * In Edge we fall back to the minimal JSON logger implemented in `logger.edge.ts`.
 */

import type { Logger } from 'winston'

const loggerImpl = ((): Logger => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./logger.node').logger as Logger
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./logger.edge').logger as Logger
})()

export const l = loggerImpl
export const logger = loggerImpl
export default loggerImpl
