export const AUTH_URLS = {
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/dashboard/account/reset-password',
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
  TEAM: (teamId: string) => `/dashboard/${teamId}/team`,
  SANDBOXES: (teamId: string) => `/dashboard/${teamId}/sandboxes`,
  TEMPLATES: (teamId: string) => `/dashboard/${teamId}/templates`,
  USAGE: (teamId: string) => `/dashboard/${teamId}/usage`,
  BILLING: (teamId: string) => `/dashboard/${teamId}/billing`,
  BUDGET: (teamId: string) => `/dashboard/${teamId}/budget`,
  KEYS: (teamId: string) => `/dashboard/${teamId}/keys`,
}

export const BASE_URL = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === 'production'
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : `https://${process.env.VERCEL_BRANCH_URL}`
  : 'http://localhost:3000'
