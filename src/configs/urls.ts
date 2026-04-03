export const AUTH_URLS = {
  FORGOT_PASSWORD: '/forgot-password',
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  CONFIRM: '/confirm',
  CALLBACK: '/api/auth/callback',
  CLI: '/auth/cli',
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
    `/dashboard/${teamSlug}/sandboxes?tab=monitoring`,
  SANDBOXES_MONITORING: (teamSlug: string) =>
    `/dashboard/${teamSlug}/sandboxes?tab=monitoring`,
  SANDBOXES_LIST: (teamSlug: string) =>
    `/dashboard/${teamSlug}/sandboxes?tab=list`,

  SANDBOX: (teamSlug: string, sandboxId: string) =>
    `/dashboard/${teamSlug}/sandboxes/${sandboxId}/monitoring`,
  SANDBOX_MONITORING: (teamSlug: string, sandboxId: string) =>
    `/dashboard/${teamSlug}/sandboxes/${sandboxId}/monitoring`,
  SANDBOX_LOGS: (teamSlug: string, sandboxId: string) =>
    `/dashboard/${teamSlug}/sandboxes/${sandboxId}/logs`,
  SANDBOX_FILESYSTEM: (teamSlug: string, sandboxId: string) =>
    `/dashboard/${teamSlug}/sandboxes/${sandboxId}/filesystem`,

  WEBHOOKS: (teamSlug: string) => `/dashboard/${teamSlug}/webhooks`,

  TEMPLATES: (teamSlug: string) => `/dashboard/${teamSlug}/templates`,
  TEMPLATES_LIST: (teamSlug: string) =>
    `/dashboard/${teamSlug}/templates?tab=list`,
  TEMPLATES_BUILDS: (teamSlug: string) =>
    `/dashboard/${teamSlug}/templates?tab=builds`,
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
