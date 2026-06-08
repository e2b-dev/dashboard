import { type Context, diag } from '@opentelemetry/api'
import type { LogRecordProcessor, SdkLogRecord } from '@opentelemetry/sdk-logs'
import { after } from 'next/server'

const NEXT_AFTER_OUTSIDE_REQUEST_ERROR_CODE = 'E468'

function isAfterOutsideRequestScopeError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (Reflect.get(error, '__NEXT_ERROR_CODE') ===
      NEXT_AFTER_OUTSIDE_REQUEST_ERROR_CODE ||
      error.message.includes('`after` was called outside a request scope'))
  )
}

export class NextAfterLogRecordProcessor implements LogRecordProcessor {
  private pendingFlushScheduled = false

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
    if (this.pendingFlushScheduled) {
      return
    }

    this.pendingFlushScheduled = true

    try {
      after(async () => {
        try {
          await this.delegate.forceFlush()
        } catch (error) {
          diag.warn(
            'Failed to flush OpenTelemetry logs in Next.js after()',
            error
          )
        } finally {
          this.pendingFlushScheduled = false
        }
      })
    } catch (error) {
      this.pendingFlushScheduled = false

      if (isAfterOutsideRequestScopeError(error)) {
        return
      }

      diag.warn(
        'Failed to schedule OpenTelemetry log flush in Next.js after()',
        error
      )
    }
  }
}
