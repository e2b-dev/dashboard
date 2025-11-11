import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import { initTRPC, TRPCError } from '@trpc/server'
import { unauthorized } from 'next/navigation'
import superjson from 'superjson'
import z, { flattenError, ZodError } from 'zod'
import checkUserTeamAuth from '../auth/check-user-team-auth'
import { getSessionInsecure } from '../auth/get-session'
import getUserByToken from '../auth/get-user-by-token'
import { getTeamIdFromSegment } from '../team/get-team-id-from-segment'

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
export const teamProcedure = protectedProcedure
  .input(
    z.object({
      teamIdOrSlug: TeamIdOrSlugSchema,
    })
  )
  .use(async ({ ctx, next, input }) => {
    const teamId = await getTeamIdFromSegment(input.teamIdOrSlug)

    if (!teamId) {
      throw unauthorized()
    }

    const isAuthorized = await checkUserTeamAuth(ctx.user.id, teamId)

    if (!isAuthorized) {
      throw unauthorized()
    }

    return next({
      ctx: {
        ...ctx,
        teamId,
      },
    })
  })
