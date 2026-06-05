import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { isAuthMigrationInProgress } from '@/configs/flags'
import type { AuthUser } from '@/core/server/auth'
import { createAuthForHeaders } from '@/core/server/auth'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedProcedure } from '@/core/server/trpc/procedures'
import { l } from '@/core/shared/clients/logger/logger'
import { generateE2BUserAccessToken } from '@/lib/utils/server'

// How long the live identity-provider profile lookup is allowed to take before
// we fall back to the cheap session user. Keeps a slow Ory admin API out of the
// critical render path for every dashboard page.
const PROFILE_LOOKUP_TIMEOUT_MS = 3000

const UpdateUserSchema = z
  .object({
    email: z.email().optional(),
    password: z.string().min(8).optional(),
    name: z.string().min(1).max(100).optional(),
  })
  .refine((data) => Boolean(data.email || data.password || data.name), {
    message: 'At least one field must be provided (email, password, name)',
    path: [],
  })

const TIMEOUT = Symbol('profile-lookup-timeout')

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T | typeof TIMEOUT> {
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<typeof TIMEOUT>((resolve) => {
        timeout = setTimeout(() => resolve(TIMEOUT), ms)
        timeout.unref?.()
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export const userRouter = createTRPCRouter({
  // Live profile (full traits + credential-derived providers). Prefetched once
  // per dashboard load and injected into DashboardContext. The lookup is raced
  // against a timeout and falls back to the cheap session user so the dashboard
  // never hangs on the identity provider.
  profile: protectedProcedure.query(async ({ ctx }): Promise<AuthUser> => {
    const provider = createAuthForHeaders(ctx.headers)

    const result = await withTimeout(
      provider.getUserProfile().catch(() => null),
      PROFILE_LOOKUP_TIMEOUT_MS
    )

    if (result && result !== TIMEOUT) {
      return result
    }

    l.error(
      {
        key: 'trpc_user_profile:fallback',
        user_id: ctx.user.id,
        context: { timed_out: result === TIMEOUT },
      },
      'user profile lookup failed or timed out; falling back to session user'
    )

    return ctx.user
  }),

  update: protectedProcedure
    .input(UpdateUserSchema)
    .mutation(async ({ ctx, input }) => {
      // Basic security check: a password must not equal the account email
      // (current or the new one being set in the same request).
      if (input.password) {
        const password = input.password.toLowerCase()
        const matchesCurrentEmail = password === ctx.user.email?.toLowerCase()
        const matchesNewEmail =
          input.email !== undefined && password === input.email.toLowerCase()

        if (matchesCurrentEmail || matchesNewEmail) {
          return { status: 'error' as const, code: 'weak_password' as const }
        }
      }

      const provider = createAuthForHeaders(ctx.headers)

      if (input.email !== undefined || input.password !== undefined) {
        if (isAuthMigrationInProgress()) {
          return {
            status: 'error' as const,
            code: 'account_credentials_not_changeable' as const,
          }
        }

        const profile = await withTimeout(
          provider.getUserProfile().catch(() => null),
          PROFILE_LOOKUP_TIMEOUT_MS
        )
        const credentialProfile =
          profile && profile !== TIMEOUT ? profile : ctx.user

        if (!profile || profile === TIMEOUT) {
          l.warn(
            {
              key: 'trpc_user_update:profile_fallback',
              user_id: ctx.user.id,
              context: { timed_out: profile === TIMEOUT },
            },
            'user profile lookup failed during credential update; falling back to session user capabilities'
          )
        }

        if (
          (input.email !== undefined && !credentialProfile.canChangeEmail) ||
          (input.password !== undefined && !credentialProfile.canChangePassword)
        ) {
          return {
            status: 'error' as const,
            code: 'account_credentials_not_changeable' as const,
          }
        }
      }

      const result = await provider.updateUser({
        email: input.email,
        password: input.password,
        name: input.name,
      })

      if (result.ok) {
        // Invalidate other sessions when the password changed.
        if (input.password) {
          await provider.signOutOtherSessions()
        }

        return { status: 'ok' as const, user: result.user }
      }

      if (result.code === 'reauthentication_needed') {
        return { status: 'reauth' as const }
      }

      return { status: 'error' as const, code: result.code }
    }),

  // Creates (POSTs) a fresh E2B access token — non-idempotent, fired on demand.
  createAccessToken: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      return await generateE2BUserAccessToken(ctx.session.access_token)
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate access token',
        cause: error,
      })
    }
  }),
})
