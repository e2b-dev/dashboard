import type { Logger } from 'winston'

// Simple logger that wraps console.log/error for Edge and Browser environments
function write(level: string, args: unknown[]): Logger {
  const message = args[0]
  const rest = args.slice(1)

  if (level === 'error') {
    console.error(message, ...rest)
  } else {
    console.log(message, ...rest)
  }

  return logger as Logger
}

export const logger: Partial<Logger> = {
  debug: (...args: unknown[]) => write('debug', args),
  info: (...args: unknown[]) => write('info', args),
  warn: (...args: unknown[]) => write('warn', args),
  error: (...args: unknown[]) => write('error', args),
} as const
