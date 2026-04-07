import pino from 'pino'

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
  }

  return pino(baseConfig)
}

const logger = createLogger()

export { logger }
