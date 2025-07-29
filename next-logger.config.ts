import { pino } from 'pino'

// ----------------------------------------------------------------------------
// Paths that should be redacted from all log entries. Pino uses fast-redact
// under the hood so we can pass the same wildcard syntax we previously used
// with `piiRedact`.
// ----------------------------------------------------------------------------
const REDACTION_PATHS = [
  'password',
  'confirmPassword',
  'accessToken',
  'secret',
  'token',
  'apiKey',
  '*.*.password',
  '*.*.confirmPassword',
  '*.*.accessToken',
  '*.*.secret',
  '*.*.token',
  '*.*.apiKey',
  '*.*.key',
  '*.*.*.password',
  '*.*.*.confirmPassword',
  '*.*.*.accessToken',
  '*.*.*.secret',
  '*.*.*.token',
  '*.*.*.apiKey',
  '*.*.*.key',
]

const createLogger = () => {
  const baseConfig = {
    redact: {
      paths: REDACTION_PATHS,
      censor: '[Redacted]',
    },
  }

  if (process.env.NEXT_RUNTIME === 'edge' || typeof process === 'undefined') {
    return pino(baseConfig)
  }

  if (process.env.LOKI_HOST) {
    try {
      // const transport = pino.transport({
      //   targets: [
      //     {
      //       target: 'pino-loki',
      //       level: 'info',
      //       options: {
      //         labels: {
      //           app: process.env.SERVICE_NAME || 'dashboard',
      //           service: process.env.OTEL_SERVICE_NAME || 'e2b-dashboard',
      //           env: process.env.NODE_ENV || 'development',
      //         },
      //         host: process.env.LOKI_HOST,
      //         basicAuth: {
      //           username: process.env.LOKI_USERNAME,
      //           password: process.env.LOKI_PASSWORD,
      //         },
      //       },
      //     },
      //     {
      //       target: 'pino/file',
      //       level: 'info',
      //       options: {
      //         destination: 1,
      //       },
      //     },
      //   ],
      // })
      //
      // console.info('transport', transport)

      const logger = pino({
        redact: {
          paths: REDACTION_PATHS,
          censor: '[Redacted]',
        },
        transport: {
          targets: [
            {
              target: 'pino-loki',
              level: 'info',
              options: {
                labels: {
                  app: process.env.SERVICE_NAME || 'dashboard',
                  service: process.env.OTEL_SERVICE_NAME || 'e2b-dashboard',
                  env: process.env.NODE_ENV || 'development',
                },
                host: process.env.LOKI_HOST,
                basicAuth: {
                  username: process.env.LOKI_USERNAME,
                  password: process.env.LOKI_PASSWORD,
                },
              },
            },
            {
              target: 'pino/file',
              level: 'info',
              options: {
                destination: 1,
              },
            },
          ],
        },
      })
      return logger
    } catch (error) {
      console.error(
        'Failed to create Loki transport, falling back to basic logger:',
        error
      )
      return pino(baseConfig)
    }
  }

  return pino(baseConfig)
}

const logger = createLogger()

export { logger }
