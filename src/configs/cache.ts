export const CACHE_TAGS = {
  TEAM_ID_FROM_SLUG: (segment: string) => `team-id-from-slug-${segment}`,
  TEAM_USAGE: (teamId: string) => `team-usage-${teamId}`,

  DEFAULT_TEMPLATES: 'default-templates',
} as const
