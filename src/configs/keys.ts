/*
 * cookie keys in use
 */
export const COOKIE_KEYS = {
  API_DOMAIN: 'e2b-api-domain',
  SELECTED_TEAM_ID: 'e2b-selected-team-id',
  SELECTED_TEAM_SLUG: 'e2b-selected-team-slug',
  SIDEBAR_STATE: 'e2b-sidebar-state',
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
}
