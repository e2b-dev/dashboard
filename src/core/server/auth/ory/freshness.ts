// Must match Kratos's `selfservice.flows.settings.privileged_session_max_age`
// (15m). The dashboard changes credentials via the admin API, which bypasses
// Kratos's own privileged-session enforcement, so we mirror the window here.
export const KRATOS_PRIVILEGED_SESSION_MAX_AGE_SECONDS = 900

// Kratos stamps `authenticated_at` with the last active authentication, which a
// `prompt=login` re-auth refreshes. Gates privileged operations (password/email
// change) against the same window Kratos enforces natively on its settings flow.
export function isKratosSessionFresh(
  authenticatedAt: string | Date | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!authenticatedAt) return false

  const authedMs = new Date(authenticatedAt).getTime()
  if (Number.isNaN(authedMs)) return false

  return (nowMs - authedMs) / 1000 <= KRATOS_PRIVILEGED_SESSION_MAX_AGE_SECONDS
}
