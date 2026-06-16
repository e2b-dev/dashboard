import { context, SpanStatusCode, trace } from '@opentelemetry/api'
import { unauthorizedUserError } from '@/core/server/adapters/errors'
import { getAuthContext } from '@/core/server/auth'
import { t } from '@/core/server/trpc/init'
import { l } from '@/core/shared/clients/logger/logger'
import { getTracer } from '@/core/shared/clients/tracer'

export const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const tracer = getTracer()

  const span = tracer.startSpan('trpc.middleware.auth')
  span.setAttribute('trpc.middleware.name', 'auth')

  try {
    const authContext = await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        return await getAuthContext(ctx.authSession)
      }
    )

    if (!authContext) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'session not found',
      })

      l.warn(
        {
          key: 'trpc_auth_middleware:no_session',
        },
        'tRPC auth middleware: no auth context'
      )

      throw unauthorizedUserError()
    }

    span.setStatus({ code: SpanStatusCode.OK })

    return next({
      ctx: {
        ...ctx,
        session: {
          access_token: authContext.accessToken,
          user: authContext.user,
        },
        user: authContext.user,
      },
    })
  } finally {
    span.end()
  }
})
