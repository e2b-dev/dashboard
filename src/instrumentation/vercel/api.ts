/**
 * TODO: Placeholder for the `@vercel/request-context-storage` package.
 * Replace with the real package once it's published.
 */

import type { SpanContext } from '@opentelemetry/api'

/** @internal */
export interface VercelRequestContext {
  waitUntil: (
    promiseOrFunc: Promise<unknown> | (() => Promise<unknown>)
  ) => void
  headers: Record<string, string | undefined>
  url: string
  telemetry?: {
    reportSpans: (data: unknown) => void
    rootSpanContext?: SpanContext
  }
  [key: symbol]: unknown
}

interface Reader {
  get: () => VercelRequestContext | undefined
}

const symbol = Symbol.for('@vercel/request-context')

interface GlobalWithReader {
  [symbol]?: Reader
}

/** @internal */
export function getVercelRequestContext(): VercelRequestContext | undefined {
  const reader = (globalThis as GlobalWithReader)[symbol]
  return reader?.get()
}
