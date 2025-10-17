export const AUTH_URLS = {
  FORGOT_PASSWORD: '/forgot-password',
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  CALLBACK: '/api/auth/callback',
  CLI: '/auth/cli',
}

export const PROTECTED_URLS = {
  DASHBOARD: '/dashboard',
  ACCOUNT_SETTINGS: '/dashboard/account',
  RESET_PASSWORD: '/dashboard/account',
  NEW_TEAM: '/dashboard/teams/new',
  TEAMS: '/dashboard/teams',

  RESOLVED_ACCOUNT_SETTINGS: (teamIdOrSlug: string) =>
    `/dashboard/${teamIdOrSlug}/account`,
  SETTINGS: (teamIdOrSlug: string, tab?: 'general' | 'keys') =>
    `/dashboard/${teamIdOrSlug}/settings${tab ? `?tab=${tab}` : ''}`,
  MEMBERS: (teamIdOrSlug: string) => `/dashboard/${teamIdOrSlug}/members`,

  SANDBOXES: (teamIdOrSlug: string, tab?: 'list' | 'monitoring') =>
    `/dashboard/${teamIdOrSlug}/sandboxes${tab ? `?tab=${tab}` : '?tab=monitoring'}`,

  SANDBOX: (teamIdOrSlug: string, sandboxId: string) =>
    `/dashboard/${teamIdOrSlug}/sandboxes/${sandboxId}`,
  SANDBOX_INSPECT: (teamIdOrSlug: string, sandboxId: string) =>
    `/dashboard/${teamIdOrSlug}/sandboxes/${sandboxId}/inspect`,

  TEMPLATES: (teamIdOrSlug: string) => `/dashboard/${teamIdOrSlug}/templates`,
  USAGE: (teamIdOrSlug: string) => `/dashboard/${teamIdOrSlug}/usage`,
  BILLING: (teamIdOrSlug: string) => `/dashboard/${teamIdOrSlug}/billing`,
  BUDGET: (teamIdOrSlug: string) => `/dashboard/${teamIdOrSlug}/budget`,
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
