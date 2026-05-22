import { context, SpanStatusCode, trace } from '@opentelemetry/api'
import { unauthorizedUserError } from '@/core/server/adapters/errors'
import { createAuthForHeaders } from '@/core/server/auth'
import { t } from '@/core/server/trpc/init'
import { getTracer } from '@/core/shared/clients/tracer'

export const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const tracer = getTracer()

  const span = tracer.startSpan('trpc.middleware.auth')
  span.setAttribute('trpc.middleware.name', 'auth')

  try {
    const provider = createAuthForHeaders(ctx.headers)

    const authContext = await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        return await provider.getAuthContext()
      }
    )

    if (!authContext) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'session not found',
      })

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
