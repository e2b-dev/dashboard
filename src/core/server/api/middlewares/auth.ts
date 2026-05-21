import { context, SpanStatusCode, trace } from '@opentelemetry/api'
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr'
import { unauthorizedUserError } from '@/core/server/adapters/errors'
import { SupabaseAuthSessionProvider } from '@/core/server/auth/session.supabase'
import getUserByToken from '@/core/server/functions/auth/get-user-by-token'
import { t } from '@/core/server/trpc/init'
import { getTracer } from '@/core/shared/clients/tracer'

const createSupabaseServerClient = (headers: Headers) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(headers.get('cookie') ?? '')
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            headers.append(
              'Set-Cookie',
              serializeCookieHeader(name, value, options)
            )
          })
        },
      },
    }
  )
}

export const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const tracer = getTracer()

  const span = tracer.startSpan('trpc.middleware.auth')
  span.setAttribute('trpc.middleware.name', 'auth')

  try {
    const supabase = createSupabaseServerClient(ctx.headers)

    const authContext = await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        return await new SupabaseAuthSessionProvider(supabase).getAuthContext()
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
