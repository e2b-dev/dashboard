/*
 * KV (key-value store) keys in use
 * Note: Cookie keys have been moved to @/configs/cookies
 */
export const KV_KEYS = {
  USER_TEAM_ACCESS: (userId: string, teamSlug: string) =>
    `user-team-access:${userId}:${teamSlug}`,
  TEAM_SLUG_TO_ID: (slug: string) => `team-slug:${slug}:id`,
  TEAM_ID_TO_SLUG: (teamId: string) => `team-id:${teamId}:slug`,
  WARNED_ALTERNATE_EMAIL: (email: string) => `warned-alternate-email:${email}`,
}

/*
 * SWR cache keys for data fetching
 */
export const SWR_KEYS = {
  // team metrics keys - all components using the same key share the same cache
  TEAM_METRICS_RECENT: (teamSlug: string) =>
    [`/api/teams/${teamSlug}/metrics`, teamSlug, 'recent'] as const,
  TEAM_METRICS_MONITORING: (teamSlug: string, start: number, end: number) =>
    [
      `/api/teams/${teamSlug}/metrics`,
      teamSlug,
      'monitoring',
      start,
      end,
    ] as const,
  TEAM_METRICS_HISTORICAL: (teamSlug: string, days: number) =>
    [`/api/teams/${teamSlug}/metrics`, teamSlug, 'historical', days] as const,

  // sandbox metrics keys
  SANDBOX_METRICS: (teamSlug: string, sandboxIds: string[]) =>
    [`/api/teams/${teamSlug}/sandboxes/metrics`, sandboxIds] as const,
  SANDBOX_INFO: (sandboxId: string) =>
    [`/api/sandbox/details`, sandboxId] as const,

  // sandboxes list keys
  SANDBOXES_LIST: (teamSlug: string) =>
    [`/api/teams/${teamSlug}/sandboxes/list`] as const,
}
