/**
 * Centralized cache tag configuration for Next.js "use cache" directive.
 */
export const CACHE_TAGS = {
  USER_TEAM_AUTHORIZATION: (userId: string, teamIdOrSlug: string) =>
    `user-team-authorization-${userId}-${teamIdOrSlug}`,
  USER_TEAMS: (userId: string) => `user-teams-${userId}`,

  TEAM_ID_FROM_SEGMENT: (segment: string) => `team-id-from-segment-${segment}`,
  TEAM_TIER_LIMITS: (teamId: string) => `team-tier-limits-${teamId}`,
  TEAM_TEMPLATES: (teamId: string) => `team-templates-${teamId}`,
  TEAM_SANDBOXES_LIST: (teamId: string) => `team-sandboxes-list-${teamId}`,
  TEAM_USAGE: (teamId: string) => `team-usage-${teamId}`,
  TEAM_API_KEYS: (teamId: string) => `team-api-keys-${teamId}`,
  TEAM_METRICS: (teamId: string, startMs: number, endMs: number) =>
    `team-metrics-${teamId}-${startMs}-${endMs}`,

  PASSWORD_SETTINGS_PAGE: (reauth: string) =>
    `password-settings-page-${reauth}`,

  DEFAULT_TEMPLATES: 'default-templates',
  NOT_FOUND_PAGE: 'not-found-page',
} as const
