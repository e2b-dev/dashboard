import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

/**
 * Cookie keys used throughout the application.
 * Organized by functionality for better maintainability.
 */
export const COOKIE_KEYS = {
  // httpOnly; holds the team API key used against infra-api / dashboard-api.
  API_KEY: 'e2b_api_key',

  SIDEBAR_STATE: 'e2b-sidebar-state',

  SANDBOX_INSPECT_ROOT_PATH: 'e2b-sandbox-inspect-root-path',

  DASHBOARD_TIMEZONE: 'e2b-dashboard-timezone',
} as const

export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // 1 year

const BASE_COOKIE_OPTIONS: Partial<ResponseCookie> = {
  path: '/',
  maxAge: COOKIE_MAX_AGE_SECONDS,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
}

/**
 * Cookie-specific options mapped by cookie key.
 * Uses BASE_COOKIE_OPTIONS as default and spreads custom overrides.
 */
export const COOKIE_OPTIONS = {
  [COOKIE_KEYS.API_KEY]: {
    ...BASE_COOKIE_OPTIONS,
    httpOnly: true,
  },
  [COOKIE_KEYS.SIDEBAR_STATE]: {
    ...BASE_COOKIE_OPTIONS,
  },
  [COOKIE_KEYS.SANDBOX_INSPECT_ROOT_PATH]: {
    ...BASE_COOKIE_OPTIONS,
  },
  [COOKIE_KEYS.DASHBOARD_TIMEZONE]: {
    ...BASE_COOKIE_OPTIONS,
  },
} as const
