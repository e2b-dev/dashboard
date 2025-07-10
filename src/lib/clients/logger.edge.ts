import { context, trace } from '@opentelemetry/api'
import type { Logger } from 'pino'

// Small JSON logger for the Edge runtime (no stdout streams available)
// Vercel captures console.log/console.error and forwards the string to Log Drains.

function write(level: string, args: unknown[]) {
  const span = trace.getSpan(context.active())
  const { traceId, spanId } = span?.spanContext() ?? {}

  const meta = {
    ts: Date.now(),
    level,
    message: typeof args[0] === 'string' ? args[0] : undefined,
    data:
      typeof args[0] === 'string' && args.length > 1
        ? args.slice(1)
        : undefined,
    traceId,
    spanId,
  }

  const metaString = JSON.stringify(meta)

  // If first argument is an object, log it raw alongside the metadata
  if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
    if (level === 'error') {
      console.error(metaString, args[0], ...args.slice(1))
    } else {
      console.log(metaString, args[0], ...args.slice(1))
    }
  } else {
    // Otherwise just log the metadata string
    if (level === 'error') {
      console.error(metaString)
    } else {
      console.log(metaString)
    }
  }
}

export const logger: Partial<Logger> = {
  debug: (obj: unknown, msg?: string, ...ctx: unknown[]) =>
    write('debug', [obj, msg, ...ctx]),
  info: (obj: unknown, msg?: string, ...ctx: unknown[]) =>
    write('info', [obj, msg, ...ctx]),
  warn: (obj: unknown, msg?: string, ...ctx: unknown[]) =>
    write('warn', [obj, msg, ...ctx]),
  error: (obj: unknown, msg?: string, ...ctx: unknown[]) =>
    write('error', [obj, msg, ...ctx]),
} as const
