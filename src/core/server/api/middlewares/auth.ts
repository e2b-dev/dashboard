import { context, SpanStatusCode, trace } from '@opentelemetry/api'
import { unauthorizedUserError } from '@/core/server/adapters/errors'
import { createManagedSupabaseAuthProviderForHeaders } from '@/core/server/auth/managed-supabase-auth-provider'
import getUserByToken from '@/core/server/functions/auth/get-user-by-token'
import { t } from '@/core/server/trpc/init'
import { getTracer } from '@/core/shared/clients/tracer'

export const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const tracer = getTracer()

  const span = tracer.startSpan('trpc.middleware.auth')
  span.setAttribute('trpc.middleware.name', 'auth')

  try {
    const provider = createManagedSupabaseAuthProviderForHeaders(ctx.headers)

    const authContext = await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        return await provider.authContext
      }
    )

    if (!authContext) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'session not found',
      })

      throw unauthorizedUserError()
    }

    const {
      data: { user },
    } = await context.with(trace.setSpan(context.active(), span), async () => {
      return await getUserByToken(authContext.accessToken)
    })

    if (!user) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'user not found for session',
      })

      throw unauthorizedUserError()
    }

    span.setStatus({ code: SpanStatusCode.OK })

    return next({
      ctx: {
        ...ctx,
        session: {
          access_token: authContext.accessToken,
          user,
        },
        user,
      },
    })
  } finally {
    span.end()
  }
})
