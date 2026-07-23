import { context, SpanStatusCode, trace } from '@opentelemetry/api'
import { unauthorizedUserError } from '@/core/server/adapters/errors'
import { getApiKey } from '@/core/server/auth'
import { t } from '@/core/server/trpc/init'
import { l } from '@/core/shared/clients/logger/logger'
import { getTracer } from '@/core/shared/clients/tracer'

export const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const tracer = getTracer()

  const span = tracer.startSpan('trpc.middleware.auth')
  span.setAttribute('trpc.middleware.name', 'auth')

  try {
    const apiKey = await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        return await getApiKey()
      }
    )

    if (!apiKey) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'api key not found',
      })

      l.warn(
        {
          key: 'trpc_auth_middleware:no_api_key',
        },
        'tRPC auth middleware: no api key'
      )

      throw unauthorizedUserError()
    }

    span.setStatus({ code: SpanStatusCode.OK })

    return next({
      ctx: {
        ...ctx,
        apiKey,
      },
    })
  } finally {
    span.end()
  }
})
