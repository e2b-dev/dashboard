export const AUTH_URLS = {
  FORGOT_PASSWORD: '/recovery',
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  SIGN_OUT: '/api/auth/sign-out',
  SWITCH_ACCOUNT: '/api/auth/switch-account',
  CLI: '/auth/cli',
  // Shell-less Ory settings page (password reset + account config). Reachable
  // with only a Kratos session, so the post-recovery password reset works
  // before any e2b_session (Hydra token) exists. Kratos' settings_ui_url.
  SETTINGS: '/settings',
}

export const PROTECTED_URLS = {
  DASHBOARD: '/dashboard',
  ACCOUNT_SETTINGS: '/dashboard/account',
  RESET_PASSWORD: '/dashboard/account',
  NEW_TEAM: '/dashboard/teams/new',
  TEAMS: '/dashboard/teams',

  RESOLVED_ACCOUNT_SETTINGS: (teamSlug: string) =>
    `/dashboard/${teamSlug}/account`,

  GENERAL: (teamSlug: string) => `/dashboard/${teamSlug}/general`,
  KEYS: (teamSlug: string) => `/dashboard/${teamSlug}/keys`,
  MEMBERS: (teamSlug: string) => `/dashboard/${teamSlug}/members`,

  SANDBOXES: (teamSlug: string) =>
    `/dashboard/${teamSlug}/sandboxes/monitoring`,
  SANDBOXES_MONITORING: (teamSlug: string) =>
    `/dashboard/${teamSlug}/sandboxes/monitoring`,
  SANDBOXES_LIST: (teamSlug: string) => `/dashboard/${teamSlug}/sandboxes/list`,

  SANDBOX: (teamSlug: string, sandboxId: string) =>
    `/dashboard/${teamSlug}/sandboxes/${sandboxId}/monitoring`,
  SANDBOX_MONITORING: (teamSlug: string, sandboxId: string) =>
    `/dashboard/${teamSlug}/sandboxes/${sandboxId}/monitoring`,
  SANDBOX_EVENTS: (teamSlug: string, sandboxId: string) =>
    `/dashboard/${teamSlug}/sandboxes/${sandboxId}/events`,
  SANDBOX_LOGS: (teamSlug: string, sandboxId: string) =>
    `/dashboard/${teamSlug}/sandboxes/${sandboxId}/logs`,
  SANDBOX_TERMINAL: (teamSlug: string, sandboxId: string) =>
    `/dashboard/${teamSlug}/sandboxes/${sandboxId}/terminal`,
  SANDBOX_FILESYSTEM: (teamSlug: string, sandboxId: string) =>
    `/dashboard/${teamSlug}/sandboxes/${sandboxId}/filesystem`,

  WEBHOOKS: (teamSlug: string) => `/dashboard/${teamSlug}/webhooks`,
  WEBHOOK: (teamSlug: string, webhookId: string) =>
    `/dashboard/${teamSlug}/webhooks/${webhookId}/overview`,
  WEBHOOK_OVERVIEW: (teamSlug: string, webhookId: string) =>
    `/dashboard/${teamSlug}/webhooks/${webhookId}/overview`,
  WEBHOOK_DELIVERIES: (teamSlug: string, webhookId: string) =>
    `/dashboard/${teamSlug}/webhooks/${webhookId}/deliveries`,

  TEMPLATES: (teamSlug: string) => `/dashboard/${teamSlug}/templates/list`,
  TEMPLATES_LIST: (teamSlug: string) => `/dashboard/${teamSlug}/templates/list`,
  TEMPLATES_BUILDS: (teamSlug: string) =>
    `/dashboard/${teamSlug}/templates/builds`,
  TEMPLATE_OVERVIEW: (teamSlug: string, templateId: string) =>
    `/dashboard/${teamSlug}/templates/${templateId}/overview`,
  TEMPLATE_DETAIL_BUILDS: (teamSlug: string, templateId: string) =>
    `/dashboard/${teamSlug}/templates/${templateId}/builds`,
  TEMPLATE_TAGS: (teamSlug: string, templateId: string) =>
    `/dashboard/${teamSlug}/templates/${templateId}/tags`,
  TEMPLATE_TAG_HISTORY: (teamSlug: string, templateId: string, tag: string) =>
    `/dashboard/${teamSlug}/templates/${templateId}/tags/${encodeURIComponent(tag)}`,
  TEMPLATE_BUILD: (teamSlug: string, templateId: string, buildId: string) =>
    `/dashboard/${teamSlug}/templates/${templateId}/builds/${buildId}`,

  USAGE: (teamSlug: string) => `/dashboard/${teamSlug}/usage`,
  BILLING: (teamSlug: string) => `/dashboard/${teamSlug}/billing`,
  BILLING_PLAN: (teamSlug: string) => `/dashboard/${teamSlug}/billing/plan`,
  BILLING_PLAN_SELECT: (teamSlug: string) =>
    `/dashboard/${teamSlug}/billing/plan/select`,
  LIMITS: (teamSlug: string) => `/dashboard/${teamSlug}/limits`,
}

export const RESOLVER_URLS = {
  INSPECT_SANDBOX: (sandboxId: string) =>
    `/dashboard/inspect/sandbox/${sandboxId}`,
}

/**
 * Route segments (after teamIdOrSlug) that contain team-specific
 * resource IDs in their sub-paths. When switching teams, paths
 * deeper than the segment root will be truncated to avoid 404s.
 *
 * e.g. /dashboard/{team}/sandboxes/{sandboxId}/monitoring
 *    → /dashboard/{newTeam}/sandboxes
 */
export const TEAM_SPECIFIC_RESOURCE_SEGMENTS: readonly string[] = [
  'sandboxes',
  'templates',
  'webhooks',
]

export const HELP_URLS = {
  BUILD_TEMPLATE:
    'https://e2b.dev/docs/sandbox-template#4-build-your-sandbox-template',
  START_COMMAND: 'https://e2b.dev/docs/sandbox-template/start-cmd',
}

export const BASE_URL = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === 'production'
    ? 'https://e2b.dev'
    : `https://${process.env.VERCEL_BRANCH_URL}`
  : 'http://localhost:3000'

export const GITHUB_URL = 'https://github.com/e2b-dev'
