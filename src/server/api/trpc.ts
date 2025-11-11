/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { flattenError, ZodError } from 'zod'
import { getSessionInsecure } from '../auth/get-session'
import getUserByToken from '../auth/get-user-by-token'

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

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const supabase = createSupabaseServerClient(opts.headers)

  const session = await getSessionInsecure(supabase)

  let user: User | null = null

  // if there is a session, also get the user
  if (session?.access_token) {
    const {
      data: { user: userData },
    } = await getUserByToken(session.access_token)

    user = userData
  }

  return {
    session,
    user,
    ...opts,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? flattenError(error.cause) : null,
      },
    }
  },
})

export const createCallerFactory = t.createCallerFactory
export const createTRPCRouter = t.router

// PROCEDURES

export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
    },
  })
})
