import { context, SpanStatusCode, trace } from '@opentelemetry/api'
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr'
import { getTracer } from '@/lib/clients/tracer'
import { getSessionInsecure } from '@/server/auth/get-session'
import getUserByToken from '@/server/auth/get-user-by-token'
import { unauthorizedUserError } from '../errors'
import { t } from '../init'

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
          cookiesToSet.forEach(({ name, value, options }) =>
            headers.append(
              'Set-Cookie',
              serializeCookieHeader(name, value, options)
            )
          )
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

    const session = await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        return await getSessionInsecure(supabase)
      }
    )

    if (!session) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'session not found',
      })

      throw unauthorizedUserError()
    }

    const {
      data: { user },
    } = await context.with(trace.setSpan(context.active(), span), async () => {
      return await getUserByToken(session.access_token)
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
        session,
        user,
      },
    })
  } finally {
    span.end()
  }
})
