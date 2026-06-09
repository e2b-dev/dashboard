import type { LogRecordProcessor, SdkLogRecord } from '@opentelemetry/sdk-logs'
import { after } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextAfterLogRecordProcessor } from '@/core/server/observability/next-after-log-record-processor'

vi.mock('next/server', () => ({
  after: vi.fn(),
}))

const logRecord = {} as SdkLogRecord
const mockedAfter = vi.mocked(after)
type AfterTask = Parameters<typeof after>[0]

class TestLogRecordProcessor implements LogRecordProcessor {
  readonly onEmit = vi.fn()
  readonly forceFlush = vi.fn(async () => {})
  readonly shutdown = vi.fn(async () => {})
}

function createOutsideRequestScopeError(): Error {
  const error = new Error('`after` was called outside a request scope')
  Reflect.set(error, '__NEXT_ERROR_CODE', 'E468')
  return error
}

afterEach(() => {
  mockedAfter.mockReset()
  vi.clearAllMocks()
})

describe('NextAfterLogRecordProcessor', () => {
  it('delegates log records outside a request scope', () => {
    mockedAfter.mockImplementation(() => {
      throw createOutsideRequestScopeError()
    })

    const delegate = new TestLogRecordProcessor()
    const processor = new NextAfterLogRecordProcessor(delegate)

    processor.onEmit(logRecord)

    expect(delegate.onEmit).toHaveBeenCalledWith(logRecord, undefined)
    expect(delegate.forceFlush).not.toHaveBeenCalled()
  })

  it('schedules an after() flush for each emitted log record', async () => {
    const callbacks: Array<() => unknown> = []
    mockedAfter.mockImplementation((task: AfterTask) => {
      callbacks.push(typeof task === 'function' ? task : async () => await task)
    })

    const delegate = new TestLogRecordProcessor()
    const processor = new NextAfterLogRecordProcessor(delegate)

    processor.onEmit(logRecord)
    processor.onEmit(logRecord)

    expect(delegate.onEmit).toHaveBeenCalledTimes(2)
    expect(mockedAfter).toHaveBeenCalledTimes(2)

    await Promise.all(callbacks.map((callback) => callback()))

    expect(delegate.forceFlush).toHaveBeenCalledTimes(2)
  })
})
