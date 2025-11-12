import { getSessionInsecure } from '@/server/auth/get-session'
import getUserByToken from '@/server/auth/get-user-by-token'
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr'
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
          cookiesToSet.forEach(({ name, value }) =>
            headers.append(
              'Set-Cookie',
              serializeCookieHeader(name, value, {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
              })
            )
          )
        },
      },
    }
  )
}

export const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const supabase = createSupabaseServerClient(ctx.headers)

  const session = await getSessionInsecure(supabase)

  if (!session) {
    throw unauthorizedUserError()
  }

  const {
    data: { user },
  } = await getUserByToken(session.access_token)

  if (!user) {
    throw unauthorizedUserError()
  }

  return next({
    ctx: {
      ...ctx,
      session,
      user,
    },
  })
})
