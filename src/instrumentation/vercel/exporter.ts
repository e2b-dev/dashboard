import { diag } from '@opentelemetry/api'
import { ExportResultCode, type ExportResult } from '@opentelemetry/core'
import { JsonTraceSerializer } from '@opentelemetry/otlp-transformer'
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base'
import { getVercelRequestContext } from './api'

export class VercelRuntimeSpanExporter implements SpanExporter {
  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void
  ): void {
    const context = getVercelRequestContext()
    if (!context?.telemetry) {
      diag.warn('@vercel/otel: no telemetry context found')
      resultCallback({ code: ExportResultCode.SUCCESS, error: undefined })
      return
    }

    try {
      // Converts a Span to IResourceSpans > IScopeSpans > ISpan structure, which
      // is OTLP format. It's can be directly serialized to JSON or converted
      // to Protobuf.
      // {
      //   // Uses hex-encoding trace and span IDs. Otherwise, base64 is used.
      //   useHex: true,
      //   // Uses `{high, low}` format for timestamps. Otherwise, `unixNanon` is used.
      //   // TODO Fix this
      //   useLongBits: false,
      // }
      const data = JsonTraceSerializer.serializeRequest(spans)

      context.telemetry.reportSpans(data)
      resultCallback({ code: ExportResultCode.SUCCESS, error: undefined })
    } catch (e) {
      resultCallback({
        code: ExportResultCode.FAILED,
        error: e instanceof Error ? e : new Error(String(e)),
      })
    }
  }

  shutdown(): Promise<void> {
    return Promise.resolve()
  }

  forceFlush?(): Promise<void> {
    return Promise.resolve()
  }
}
