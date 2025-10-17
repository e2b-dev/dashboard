/*
 * KV (key-value store) keys in use
 * Note: Cookie keys have been moved to @/configs/cookies
 */
export const KV_KEYS = {
  USER_TEAM_ACCESS: (userId: string, teamIdOrSlug: string) =>
    `user-team-access:${userId}:${teamIdOrSlug}`,
  TEAM_SLUG_TO_ID: (slug: string) => `team-slug:${slug}:id`,
  TEAM_ID_TO_SLUG: (teamId: string) => `team-id:${teamId}:slug`,
  WARNED_ALTERNATE_EMAIL: (email: string) => `warned-alternate-email:${email}`,
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

  // sandboxes list keys
  SANDBOXES_LIST: (teamId: string) =>
    [`/api/teams/${teamId}/sandboxes/list`] as const,
}
