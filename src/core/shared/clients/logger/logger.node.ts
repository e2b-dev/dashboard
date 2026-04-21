import pino from 'pino'
import { REDACTION_CENSOR, REDACTION_PATHS } from './redaction'

const createLogger = () => {
  const baseConfig = {
    redact: {
      paths: REDACTION_PATHS,
      censor: REDACTION_CENSOR,
    },
  }

  return pino(baseConfig)
}

const logger = createLogger()

export { logger }
