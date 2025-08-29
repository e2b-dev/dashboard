import type { Attributes, Context } from '@opentelemetry/api'
import { diag, SpanKind, TraceFlags } from '@opentelemetry/api'
import type {
  ReadableSpan,
  Span,
  SpanProcessor,
} from '@opentelemetry/sdk-trace-base'
import type { AttributesFromHeaders } from '@vercel/otel'
import { getVercelRequestContext } from './vercel/api'
import { getVercelRequestContextAttributes } from './vercel/attributes'

export function isSampled(traceFlags: number): boolean {
  // eslint-disable-next-line no-bitwise
  return (traceFlags & TraceFlags.SAMPLED) !== 0
}

/** @internal */
export class CompositeSpanProcessor implements SpanProcessor {
  private readonly rootSpanIds = new Map<
    string,
    { rootSpanId: string; open: Span[] }
  >()
  private readonly waitSpanEnd = new Map<string, () => void>()

  constructor(
    private processors: SpanProcessor[],
    private attributesFromHeaders: AttributesFromHeaders | undefined
  ) {}

  forceFlush(): Promise<void> {
    return Promise.all(
      this.processors.map((p) =>
        p.forceFlush().catch((e) => {
          diag.error('@vercel/otel: forceFlush failed:', e)
        })
      )
    ).then(() => undefined)
  }

  shutdown(): Promise<void> {
    return Promise.all(
      this.processors.map((p) => p.shutdown().catch(() => undefined))
    ).then(() => undefined)
  }

  onStart(span: Span, parentContext: Context): void {
    const { traceId, spanId, traceFlags } = span.spanContext()
    const isRoot = !this.rootSpanIds.has(traceId)
    if (isRoot) {
      this.rootSpanIds.set(traceId, { rootSpanId: spanId, open: [] })
    } else {
      this.rootSpanIds.get(traceId)?.open.push(span)
    }
    if (isRoot && isSampled(traceFlags)) {
      const vrc = getVercelRequestContext()
      const vercelRequestContextAttrs = getVercelRequestContextAttributes(
        vrc,
        this.attributesFromHeaders
      )
      if (vercelRequestContextAttrs) {
        span.setAttributes(vercelRequestContextAttrs)
      }

      // Flush the streams to avoid data loss.
      if (vrc) {
        vrc.waitUntil(async () => {
          if (this.rootSpanIds.has(traceId)) {
            // Not root has not completed yet, so no point in flushing.
            // Need to wait for onEnd.
            const promise = new Promise<void>((resolve) => {
              this.waitSpanEnd.set(traceId, resolve)
            })
            let timer: NodeJS.Timeout | undefined
            await Promise.race([
              promise,
              new Promise((resolve) => {
                timer = setTimeout(() => {
                  this.waitSpanEnd.delete(traceId)
                  resolve(undefined)
                }, 50)
              }),
            ])
            if (timer) {
              clearTimeout(timer)
            }
          }
          return this.forceFlush()
        })
      }
    }

    for (const spanProcessor of this.processors) {
      spanProcessor.onStart(span, parentContext)
    }
  }

  onEnd(span: ReadableSpan): void {
    const { traceId, spanId, traceFlags } = span.spanContext()
    const sampled = isSampled(traceFlags)
    const rootObj = this.rootSpanIds.get(traceId)
    const isRoot = rootObj?.rootSpanId === spanId

    if (sampled) {
      const resourceAttributes = getResourceAttributes(span)
      if (resourceAttributes) {
        Object.assign(span.attributes, resourceAttributes)
      }
    }

    if (isRoot) {
      this.rootSpanIds.delete(traceId)
      if (rootObj.open.length > 0) {
        for (const openSpan of rootObj.open) {
          if (!openSpan.ended && openSpan.spanContext().spanId !== spanId) {
            try {
              openSpan.end()
            } catch (e) {
              diag.error('@vercel/otel: onEnd failed:', e)
            }
          }
        }
      }
    } else if (rootObj) {
      for (let i = 0; i < rootObj.open.length; i++) {
        if (rootObj.open[i]?.spanContext().spanId === spanId) {
          rootObj.open.splice(i, 1)
        }
      }
    }

    for (const spanProcessor of this.processors) {
      spanProcessor.onEnd(span)
    }

    if (isRoot) {
      const pending = this.waitSpanEnd.get(traceId)
      if (pending) {
        this.waitSpanEnd.delete(traceId)
        pending()
      }
    }
  }
}

const SPAN_KIND_NAME: { [key in SpanKind]: string } = {
  [SpanKind.INTERNAL]: 'internal',
  [SpanKind.SERVER]: 'server',
  [SpanKind.CLIENT]: 'client',
  [SpanKind.PRODUCER]: 'producer',
  [SpanKind.CONSUMER]: 'consumer',
}

function getResourceAttributes(span: ReadableSpan): Attributes | undefined {
  const { kind, attributes } = span
  const {
    'operation.name': operationName,
    'resource.name': resourceName,
    'span.type': spanTypeAttr,
    'next.span_type': nextSpanType,
    'http.method': httpMethod,
    'http.route': httpRoute,
  } = attributes
  if (operationName) {
    return undefined
  }

  const resourceNameResolved =
    resourceName ??
    (httpMethod &&
    typeof httpMethod === 'string' &&
    httpRoute &&
    typeof httpRoute === 'string'
      ? `${httpMethod} ${httpRoute}`
      : httpRoute)

  if (
    span.kind === SpanKind.SERVER &&
    httpMethod &&
    httpRoute &&
    typeof httpMethod === 'string' &&
    typeof httpRoute === 'string'
  ) {
    return {
      'operation.name': 'web.request',
      'resource.name': resourceNameResolved,
    }
  }

  const spanType = nextSpanType ?? spanTypeAttr
  if (spanType && typeof spanType === 'string') {
    return httpRoute
      ? { 'operation.name': spanType, 'resource.name': resourceName }
      : { 'operation.name': spanType }
  }

  return {
    'operation.name':
      kind === SpanKind.INTERNAL ? 'internal' : SPAN_KIND_NAME[kind],
  }
}

function toOperationName(libraryName: string, name: string): string {
  if (!libraryName) {
    return name
  }
  let cleanLibraryName = libraryName.replace(/[ @./]/g, '_')
  if (cleanLibraryName.startsWith('_')) {
    cleanLibraryName = cleanLibraryName.slice(1)
  }
  return name ? `${cleanLibraryName}.${name}` : cleanLibraryName
}
