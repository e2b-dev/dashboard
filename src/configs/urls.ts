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
  NEW_TEAM: '/dashboard/teams/new',
  TEAMS: '/dashboard/teams',
  TEAM: (teamIdOrSlug: string) => `/dashboard/${teamIdOrSlug}/team`,
  SANDBOXES: (teamIdOrSlug: string) => `/dashboard/${teamIdOrSlug}/sandboxes`,
  TEMPLATES: (teamIdOrSlug: string) => `/dashboard/${teamIdOrSlug}/templates`,
  USAGE: (teamIdOrSlug: string) => `/dashboard/${teamIdOrSlug}/usage`,
  BILLING: (teamIdOrSlug: string) => `/dashboard/${teamIdOrSlug}/billing`,
  BUDGET: (teamIdOrSlug: string) => `/dashboard/${teamIdOrSlug}/budget`,
  KEYS: (teamIdOrSlug: string) => `/dashboard/${teamIdOrSlug}/keys`,
  RESET_PASSWORD: '/dashboard/account',
}

export const BASE_URL = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === 'production'
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : `https://${process.env.VERCEL_BRANCH_URL}`
  : 'http://localhost:3000'
