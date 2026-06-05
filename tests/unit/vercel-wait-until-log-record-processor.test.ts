import type { Context } from '@opentelemetry/api'
import type { LogRecordProcessor, SdkLogRecord } from '@opentelemetry/sdk-logs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VercelWaitUntilLogRecordProcessor } from '@/core/server/observability/vercel-wait-until-log-record-processor'

type WaitUntilCallback = () => Promise<unknown>
type WaitUntilInput = Promise<unknown> | WaitUntilCallback

const requestContextSymbol = Symbol.for('@vercel/request-context')
const logRecord = {} as SdkLogRecord

class TestLogRecordProcessor implements LogRecordProcessor {
  readonly onEmit = vi.fn()
  readonly forceFlush = vi.fn(async () => {})
  readonly shutdown = vi.fn(async () => {})
}

function installVercelRequestContext(
  waitUntil: (input: WaitUntilInput) => void
) {
  const requestContext = {
    waitUntil,
  }

  Reflect.set(globalThis, requestContextSymbol, {
    get: () => requestContext,
  })
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, requestContextSymbol)
  vi.clearAllMocks()
})

describe('VercelWaitUntilLogRecordProcessor', () => {
  it('delegates log records without a Vercel request context', () => {
    const delegate = new TestLogRecordProcessor()
    const processor = new VercelWaitUntilLogRecordProcessor(delegate)

    processor.onEmit(logRecord)

    expect(delegate.onEmit).toHaveBeenCalledWith(logRecord, undefined)
    expect(delegate.forceFlush).not.toHaveBeenCalled()
  })

  it('schedules one waitUntil flush per request context', async () => {
    const callbacks: WaitUntilCallback[] = []
    const waitUntil = vi.fn((input: WaitUntilInput) => {
      callbacks.push(
        typeof input === 'function' ? input : async () => await input
      )
    })
    installVercelRequestContext(waitUntil)

    const delegate = new TestLogRecordProcessor()
    const processor = new VercelWaitUntilLogRecordProcessor(delegate)

    processor.onEmit(logRecord)
    processor.onEmit(logRecord)

    expect(delegate.onEmit).toHaveBeenCalledTimes(2)
    expect(waitUntil).toHaveBeenCalledTimes(1)

    await callbacks[0]?.()

    expect(delegate.forceFlush).toHaveBeenCalledTimes(1)

    processor.onEmit(logRecord, {} as Context)

    expect(waitUntil).toHaveBeenCalledTimes(2)
  })
})
