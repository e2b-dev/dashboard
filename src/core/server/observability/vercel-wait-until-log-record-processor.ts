import { type Context, diag } from '@opentelemetry/api'
import type { LogRecordProcessor, SdkLogRecord } from '@opentelemetry/sdk-logs'

type WaitUntilInput = Promise<unknown> | (() => Promise<unknown>)

interface VercelRequestContext {
  waitUntil: (promiseOrFunc: WaitUntilInput) => void
}

interface VercelRequestContextReader {
  get: () => VercelRequestContext | undefined
}

// This mirrors the private request-context hook used by @vercel/otel.
const VERCEL_REQUEST_CONTEXT_SYMBOL = Symbol.for('@vercel/request-context')

function getVercelRequestContext(): VercelRequestContext | undefined {
  const reader = Reflect.get(globalThis, VERCEL_REQUEST_CONTEXT_SYMBOL) as
    | VercelRequestContextReader
    | undefined

  return reader?.get()
}

export class VercelWaitUntilLogRecordProcessor implements LogRecordProcessor {
  private readonly pendingFlushContexts = new WeakSet<VercelRequestContext>()

  constructor(private readonly delegate: LogRecordProcessor) {}

  onEmit(logRecord: SdkLogRecord, context?: Context): void {
    this.delegate.onEmit(logRecord, context)
    this.scheduleRequestFlush()
  }

  forceFlush(): Promise<void> {
    return this.delegate.forceFlush()
  }

  shutdown(): Promise<void> {
    return this.delegate.shutdown()
  }

  private scheduleRequestFlush(): void {
    const requestContext = getVercelRequestContext()

    if (!requestContext || this.pendingFlushContexts.has(requestContext)) {
      return
    }

    this.pendingFlushContexts.add(requestContext)

    try {
      requestContext.waitUntil(async () => {
        try {
          await this.delegate.forceFlush()
        } catch (error) {
          diag.warn(
            'Failed to flush OpenTelemetry logs in Vercel waitUntil',
            error
          )
        } finally {
          this.pendingFlushContexts.delete(requestContext)
        }
      })
    } catch (error) {
      this.pendingFlushContexts.delete(requestContext)
      diag.warn(
        'Failed to schedule OpenTelemetry log flush in Vercel waitUntil',
        error
      )
    }
  }
}
