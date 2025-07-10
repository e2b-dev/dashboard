import { loggerInstance } from '@/../next-logger.config'
import type { Logger } from 'winston'

const logger = loggerInstance as Logger

export { logger }
