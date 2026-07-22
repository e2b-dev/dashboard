import { type AuthUser, getUserProfile } from '@/core/server/auth'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedProcedure } from '@/core/server/trpc/procedures'
import { l } from '@/core/shared/clients/logger/logger'

// How long the live identity-provider profile lookup is allowed to take before
// we fall back to the cheap session user. Keeps a slow Ory admin API out of the
// critical render path for every dashboard page.
const PROFILE_LOOKUP_TIMEOUT_MS = 3000

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
    const result = await withTimeout(
      getUserProfile().catch(() => null),
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
})
