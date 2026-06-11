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
