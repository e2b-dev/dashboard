/*
 * cookie keys in use
 */
export const COOKIE_KEYS = {
  API_DOMAIN: 'e2b-api-domain',
  SELECTED_TEAM_ID: 'e2b-selected-team-id',
  SELECTED_TEAM_SLUG: 'e2b-selected-team-slug',
  SIDEBAR_STATE: 'e2b-sidebar-state',
  SANDBOX_INSPECT_ROOT_PATH: 'e2b-sandbox-inspect-root-path',
  SANDBOX_INSPECT_POLLING_INTERVAL: 'e2b-sandbox-inspect-polling-interval',
}

/*
 * kv keys in use
 */
export const KV_KEYS = {
  USER_TEAM_ACCESS: (userId: string, teamIdOrSlug: string) =>
    `user-team-access:${userId}:${teamIdOrSlug}`,
  TEAM_SLUG_TO_ID: (slug: string) => `team-slug:${slug}:id`,
  TEAM_ID_TO_SLUG: (teamId: string) => `team-id:${teamId}:slug`,
  WARNED_ALTERNATE_EMAIL: (email: string) => `warned-alternate-email:${email}`,
  RATE_LIMIT_SIGN_UP: (identifier: string) => `ratelimit:sign-up:${identifier}`,
}

/*
 * SWR cache keys for data fetching
 */
export const SWR_KEYS = {
  // team metrics keys - all components using the same key share the same cache
  TEAM_METRICS_RECENT: (teamId: string) =>
    [`/api/teams/${teamId}/metrics`, teamId, 'recent'] as const,
  TEAM_METRICS_MONITORING: (teamId: string, start: number, end: number) =>
    [`/api/teams/${teamId}/metrics`, teamId, 'monitoring', start, end] as const,
  TEAM_METRICS_HISTORICAL: (teamId: string, days: number) =>
    [`/api/teams/${teamId}/metrics`, teamId, 'historical', days] as const,

  // sandbox metrics keys
  SANDBOX_METRICS: (teamId: string, sandboxIds: string[]) =>
    [`/api/teams/${teamId}/sandboxes/metrics`, sandboxIds] as const,
  SANDBOX_INFO: (sandboxId: string) =>
    [`/api/sandbox/details`, sandboxId] as const,
}
