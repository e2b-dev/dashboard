import { l } from '@/lib/clients/logger/logger'
import { getMeter } from '@/lib/clients/meter'
import { getTracer } from '@/lib/clients/tracer'
import type { Span } from '@opentelemetry/api'
import {
  context,
  Counter,
  Histogram,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api'
import { User } from '@supabase/supabase-js'
import { TRPCError } from '@trpc/server'
import { serializeError } from 'serialize-error'
import { internalServerError } from '../errors'
import { t } from '../init'

/**
 * Telemetry State
 *
 * Shared state between start and end telemetry middlewares.
 * Passed through context to be enriched by downstream middlewares.
 */
interface TelemetryState {
  span: Span
  startTime: number
  procedurePath: string
  procedureName: string
  routerName: string
  procedureType: 'query' | 'mutation' | 'subscription'
  metrics: {
    durationHistogram: Histogram
    requestCounter: Counter
    errorCounter: Counter
    attrs: Record<string, string>
  }
}

/**
 * Start Telemetry Middleware
 *
 * This middleware MUST run FIRST in the middleware chain to:
 * - Create OpenTelemetry span for distributed tracing
 * - Start performance timer
 * - Initialize metrics collectors
 * - Set initial span attributes (user_id if available)
 * - Create telemetry state in context for downstream middlewares
 *
 * The span will be closed and logs written by endTelemetryMiddleware.
 */
export const startTelemetryMiddleware = t.middleware(
  async ({ ctx, next, path, type, input }) => {
    const tracer = getTracer()
    const meter = getMeter()

    const procedurePath = path || 'unknown'
    const procedureType = type

    // extract router and procedure names from path
    // e.g., "sandboxes.list" -> router: "sandboxes", procedure: "list"
    const pathParts = procedurePath.split('.')
    const procedureName = pathParts[pathParts.length - 1] || 'unknown'
    const routerName = pathParts.slice(0, -1).join('.') || 'unknown'

    const span = tracer.startSpan(`trpc:${procedurePath.replace(/\./g, ':')}`, {
      attributes: {
        'trpc.router.name': routerName,
        'trpc.procedure.type': procedureType,
        'trpc.procedure.name': procedureName,
      },
    })

    const durationHistogram = meter.createHistogram('trpc.procedure.duration', {
      description: 'Duration of tRPC procedure execution',
      unit: 'ms',
    })

    const requestCounter = meter.createCounter('trpc.procedure.requests', {
      description: 'Total number of tRPC procedure requests',
    })

    const errorCounter = meter.createCounter('trpc.procedure.errors', {
      description: 'Total number of tRPC procedure errors',
    })

    const metricAttrs = {
      'trpc.router.name': routerName,
      'trpc.procedure.type': procedureType,
      'trpc.procedure.name': procedureName,
    }

    requestCounter.add(1, metricAttrs)

    const telemetryState: TelemetryState = {
      span,
      startTime: performance.now(),
      procedurePath,
      procedureName,
      routerName,
      procedureType,
      metrics: {
        durationHistogram,
        requestCounter,
        errorCounter,
        attrs: metricAttrs,
      },
    }

    // execute within span context and pass telemetry state through
    return context.with(trace.setSpan(context.active(), span), async () => {
      return next({
        ctx: {
          ...ctx,
          telemetry: telemetryState,
        },
      })
    })
  }
)

/**
 * End Telemetry Middleware
 *
 * Runs AFTER all downstream middlewares and the procedure.
 * Collects enriched context (user_id, team_id), records metrics,
 * writes logs with complete data, and closes the span.
 *
 * Responsibilities:
 * - Collect enriched context from downstream middlewares (team_id, etc.)
 * - Record metrics with complete context
 * - Write structured logs with all available data
 * - Handle errors appropriately (expected vs unexpected)
 * - Close OpenTelemetry span with full duration
 *
 * Context Enrichment:
 * - user_id: Available from auth middleware
 * - team_id: Available from team middleware
 * - Any other attributes added to ctx by downstream middlewares
 */
export const endTelemetryMiddleware = t.middleware(
  async ({ ctx, next, input }) => {
    // call next() first - execution resumes here after everything downstream completes
    const result = await next()

    const telemetry =
      'telemetry' in ctx ? (ctx.telemetry as TelemetryState) : undefined

    if (!telemetry) {
      l.warn(
        { key: 'trpc:telemetry_not_initialized' },
        '[tRPC] Telemetry state not found in context'
      )
      return result
    }

    const {
      span,
      startTime,
      procedureName,
      routerName,
      procedureType,
      metrics,
    } = telemetry

    const duration = performance.now() - startTime
    const durationMs = Math.round(duration * 1000) / 1000

    // collect context attributes that were added by downstream middlewares
    const contextAttrs: Record<string, string> = {}

    if ('user' in ctx && ctx.user && (ctx.user as User).id) {
      span.setAttribute('user_id', (ctx.user as User).id)
      contextAttrs.user_id = (ctx.user as User).id
    }

    if ('teamId' in ctx && typeof ctx.teamId === 'string') {
      span.setAttribute('team_id', ctx.teamId)
      contextAttrs.team_id = ctx.teamId
    }

    try {
      metrics.durationHistogram.record(duration, {
        ...metrics.attrs,
        'trpc.status': result.ok ? 'success' : 'error',
      })

      if (!result.ok) {
        const error = result.error

        metrics.errorCounter.add(1, {
          ...metrics.attrs,
          'error.code': error.code,
          'error.name': error.name,
        })

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        })
        span.recordException(error)

        // internal errors with causes are unexpected bugs - log as error and obfuscate
        if (error.code === 'INTERNAL_SERVER_ERROR' && error.cause) {
          l.error(
            {
              key: 'trpc:unexpected_error',

              ...contextAttrs,

              'trpc.router.name': routerName,
              'trpc.procedure.type': procedureType,
              'trpc.procedure.name': procedureName,
              'trpc.procedure.input': input,
              'trpc.procedure.duration_ms': durationMs,

              error: serializeError(error.cause),
            },
            `[tRPC] ${routerName}.${procedureName} failed unexpectedly: ${error.cause.message}`
          )

          throw internalServerError()
        }

        // expected errors (validation, not found, etc) - log as warning
        l.warn(
          {
            key: 'trpc:procedure_failure',

            ...contextAttrs,

            'trpc.router.name': routerName,
            'trpc.procedure.type': procedureType,
            'trpc.procedure.name': procedureName,
            'trpc.procedure.input': input,
            'trpc.procedure.duration_ms': durationMs,

            error: serializeError(error),
          },
          `[tRPC] ${routerName}.${procedureName} failed: ${error.message}`
        )

        return result
      }

      span.setStatus({ code: SpanStatusCode.OK })

      l.info(
        {
          key: 'trpc:procedure_success',

          ...contextAttrs,

          'trpc.router.name': routerName,
          'trpc.procedure.type': procedureType,
          'trpc.procedure.name': procedureName,
          'trpc.procedure.input': input,
          'trpc.procedure.duration_ms': durationMs,
        },
        `[tRPC] ${routerName}.${procedureName} succeeded in ${durationMs}ms`
      )

      return result
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error
      }

      l.error(
        {
          key: 'trpc:telemetry_error',

          ...contextAttrs,

          'trpc.router.name': routerName,
          'trpc.procedure.name': procedureName,
          error: serializeError(error),
        },
        `[tRPC] Telemetry error in ${routerName}.${procedureName}`
      )

      throw internalServerError()
    } finally {
      span.end()
    }
  }
)
