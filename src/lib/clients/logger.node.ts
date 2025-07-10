import { logger as baseLogger } from '@/../next-logger.config'
import type { Logger } from 'pino'

declare global {
  const logger: typeof baseLogger
}

// instantiated in next-logger.config.js

// @ts-expect-error - globalThis is not typed
const logger = global.logger as Logger

export { logger }
