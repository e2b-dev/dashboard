import type { Span } from '@opentelemetry/api'
import {
  type Counter,
  context,
  type Histogram,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api'
import type { User } from '@supabase/supabase-js'
import { TRPCError } from '@trpc/server'
import { flattenClientInputValue } from '@/core/server/actions/utils'
import {
  getObservedError,
  getObservedErrorMessage,
  getObservedException,
  internalServerError,
  isExpectedTRPCError,
} from '@/core/server/adapters/errors'
import { t } from '@/core/server/trpc/init'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { withRequestObservabilityContext } from '@/core/shared/clients/logger/request-observability'
import { getMeter } from '@/core/shared/clients/meter'
import { getTracer } from '@/core/shared/clients/tracer'

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

const meter = getMeter()
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
  async ({ ctx, next, path, type }) => {
    const tracer = getTracer()

    const procedurePath = path || 'unknown'
    const procedureType = type

    // extract router and procedure names from path
    // e.g., "sandboxes.list" -> router: "sandboxes", procedure: "list"
    const pathParts = procedurePath.split('.')
    const procedureName = pathParts[pathParts.length - 1] || 'unknown'
    const routerName = pathParts.slice(0, -1).join('.') || 'unknown'

    const span = tracer.startSpan(
      `trpc.procedure.${routerName}.${procedureName}`,
      {
        attributes: {
          'trpc.router.name': routerName,
          'trpc.procedure.type': procedureType,
          'trpc.procedure.name': procedureName,
        },
      }
    )

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
    const requestObservability =
      ctx.requestObservability ??
      ({
        request_path: '/api/trpc',
        transport: 'trpc',
        handler_name: procedurePath,
      } as const)

    return withRequestObservabilityContext(
      {
        ...requestObservability,
        transport: 'trpc',
        handler_name: procedurePath,
      },
      () =>
        context.with(trace.setSpan(context.active(), span), async () => {
          return next({
            ctx: {
              ...ctx,
              telemetry: telemetryState,
            },
          })
        })
    )
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
  async ({ ctx, next, getRawInput }) => {
    // call next() first - execution resumes here after everything downstream completes
    const result = await next()
    const rawInput = await getRawInput()

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

    const contextAttrs: Record<string, string | undefined> = {
      template_id: flattenClientInputValue(rawInput, 'templateId'),
      sandbox_id: flattenClientInputValue(rawInput, 'sandboxId'),
    }

    // set span attributes for input inferred parameters
    for (const [k, v] of Object.entries(contextAttrs)) {
      if (!v || typeof v !== 'string') continue

      span.setAttribute(k, v)
    }

    // set span and context attributs for procedure ctx inferred parameters
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
        const observedError = getObservedError(error)
        const observedErrorMessage = getObservedErrorMessage(error)

        metrics.errorCounter.add(1, {
          ...metrics.attrs,
          'error.code': error.code,
          'error.name': error.name,
        })

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: observedErrorMessage,
        })
        span.recordException(getObservedException(error))

        const payload = {
          ...contextAttrs,

          'trpc.router.name': routerName,
          'trpc.procedure.type': procedureType,
          'trpc.procedure.name': procedureName,
          'trpc.procedure.input': rawInput,
          'trpc.procedure.duration_ms': durationMs,

          error: serializeErrorForLog(observedError),
          transport_error:
            observedError === error ? undefined : serializeErrorForLog(error),
        }

        if (!isExpectedTRPCError(error)) {
          l.error(
            {
              key: 'trpc:unexpected_error',
              ...payload,
            },
            `[tRPC] ${routerName}.${procedureName}: ${error.code} ${observedErrorMessage}`
          )

          if (error.cause) {
            throw internalServerError()
          }

          return result
        }

        l.warn(
          {
            key: 'trpc:procedure_failure',
            ...payload,
          },
          `[tRPC] ${routerName}.${procedureName}: ${error.code} ${observedErrorMessage}`
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
          'trpc.procedure.input': rawInput,
          'trpc.procedure.duration_ms': durationMs,
        },
        `[tRPC] ${routerName}.${procedureName}`
      )

      return result
    } catch (error) {
      // if the error is coming from a route (INTERNAL_SERVER_ERROR), rethrow
      if (error instanceof TRPCError) {
        throw error
      }

      l.error(
        {
          key: 'trpc:telemetry_error',

          ...contextAttrs,

          'trpc.router.name': routerName,
          'trpc.procedure.name': procedureName,

          error: serializeErrorForLog(error),
        },
        `[tRPC] telemetry error in ${routerName}.${procedureName}${error && typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' ? `: ${error.message}` : ''}`
      )

      throw internalServerError()
    } finally {
      span.end()
    }
  }
)
