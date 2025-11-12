import { l } from '@/lib/clients/logger/logger'
import { getMeter } from '@/lib/clients/meter'
import { getTracer } from '@/lib/clients/tracer'
import { context, SpanStatusCode, trace } from '@opentelemetry/api'
import { TRPCError } from '@trpc/server'
import { serializeError } from 'serialize-error'
import { t } from '../init'

/**
 * Telemetry Middleware
 *
 * Middleware that provides comprehensive observability for tRPC procedures:
 * - OpenTelemetry distributed tracing with spans
 * - Structured logging with context
 * - Metrics collection (duration, success/failure rates)
 * - Automatic extraction of business context (team_id, user_id, etc.)
 * - Error recording and tracking
 *
 * This middleware should be applied to all procedures that need observability.
 */
export const telemetryMiddleware = t.middleware(
  async ({ ctx, next, path, type, input }) => {
    const tracer = getTracer()
    const meter = getMeter()

    // procedure identification
    const procedurePath = path || 'unknown'
    const procedureType = type // query, mutation, subscription

    // extract router and function names from path
    // e.g., "sandboxes.list" -> router: "sandboxes", function: "list"
    // e.g., "sandboxes.templates.list" -> router: "sandboxes.templates", function: "list"
    const pathParts = procedurePath.split('.')
    const procedureName = pathParts[pathParts.length - 1] || 'unknown'
    const routerName = pathParts.slice(0, -1).join('.') || 'unknown'

    // create span for distributed tracing
    const span = tracer.startSpan(`trpc:${procedurePath.replace(/\./g, ':')}`, {
      attributes: {
        'trpc.router.name': routerName,
        'trpc.procedure.type': procedureType,
        'trpc.procedure.name': procedureName,
      },
    })

    // extract context attributes from ctx (set by auth/team middlewares)
    const contextAttrs: Record<string, string> = {}

    if (ctx.user?.id) {
      span.setAttribute('user_id', ctx.user.id)
      contextAttrs.user_id = ctx.user.id
    }

    if ('teamId' in ctx && typeof ctx.teamId === 'string') {
      span.setAttribute('team_id', ctx.teamId)
      contextAttrs.team_id = ctx.teamId
    }

    // metrics setup
    const procedureDurationHistogram = meter.createHistogram(
      'trpc.procedure.duration',
      {
        description: 'Duration of tRPC procedure execution',
        unit: 'ms',
      }
    )

    const procedureRequestCounter = meter.createCounter(
      'trpc.procedure.requests',
      {
        description: 'Total number of tRPC procedure requests',
      }
    )

    const procedureErrorCounter = meter.createCounter('trpc.procedure.errors', {
      description: 'Total number of tRPC procedure errors',
    })

    // metric attributes
    const metricAttrs = {
      'trpc.router.name': routerName,
      'trpc.procedure.type': procedureType,
      'trpc.procedure.name': procedureName,
    }

    // increment request counter
    procedureRequestCounter.add(1, metricAttrs)

    const startTime = performance.now()

    try {
      // execute the procedure within the span context
      const result = await context.with(
        trace.setSpan(context.active(), span),
        async () => {
          return next({ ctx })
        }
      )

      const duration = performance.now() - startTime
      const durationMs = duration.toFixed(3)

      // record metrics
      procedureDurationHistogram.record(duration, {
        ...metricAttrs,
        'trpc.status': 'success',
      })

      // mark span as successful
      span.setStatus({ code: SpanStatusCode.OK })

      // structured logging (logger handles redaction automatically via REDACTION_PATHS)
      l.info(
        {
          key: 'trpc:success',
          'trpc.router.name': routerName,
          'trpc.procedure.type': procedureType,
          'trpc.procedure.name': procedureName,
          'trpc.procedure.input': input,
          'trpc.procedure.duration_ms': durationMs,
          ...contextAttrs,
        },
        `[tRPC] ${routerName}.${procedureName} succeeded in ${durationMs}ms`
      )

      return result.ok ? result : result
    } catch (error) {
      const duration = performance.now() - startTime
      const durationMs = duration.toFixed(3)

      // record error metrics
      procedureDurationHistogram.record(duration, {
        ...metricAttrs,
        'trpc.status': 'error',
      })

      procedureErrorCounter.add(1, {
        ...metricAttrs,
        'error.type': error instanceof TRPCError ? error.code : 'unknown',
      })

      // mark span as failed
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      span.recordException(error as Error)

      if (error instanceof TRPCError) {
        span.setAttribute('error.type', error.code)
        span.setAttribute('error.message', error.message)
      }

      const serializedError = serializeError(error)
      const errorMessage =
        error instanceof TRPCError
          ? `${error.code}: ${error.message}`
          : typeof serializedError === 'object' &&
              serializedError &&
              'message' in serializedError
            ? String(serializedError.message)
            : 'Unknown error'

      // structured error logging (logger handles redaction automatically via REDACTION_PATHS)
      l.error(
        {
          key: 'trpc:error',
          'trpc.router.name': routerName,
          'trpc.procedure.type': procedureType,
          'trpc.procedure.name': procedureName,
          'trpc.procedure.input': input,
          'trpc.procedure.duration_ms': durationMs,
          error: serializedError,
          ...contextAttrs,
        },
        `[tRPC] ${routerName}.${procedureName} failed in ${durationMs}ms: ${errorMessage}`
      )

      // re-throw to maintain tRPC error handling
      throw error
    } finally {
      // always end the span
      span.end()
    }
  }
)
