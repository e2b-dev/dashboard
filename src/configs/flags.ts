import type { z } from 'zod'

export const ALLOW_SEO_INDEXING = process.env.ALLOW_SEO_INDEXING === '1'
export const VERBOSE = process.env.NEXT_PUBLIC_VERBOSE === '1'
export const ENABLE_USER_BOOTSTRAP = process.env.ENABLE_USER_BOOTSTRAP === '1'
export const INCLUDE_BILLING = process.env.NEXT_PUBLIC_INCLUDE_BILLING === '1'
export const INCLUDE_ARGUS = process.env.NEXT_PUBLIC_INCLUDE_ARGUS === '1'
export const INCLUDE_STATUS_INDICATOR =
  process.env.NEXT_PUBLIC_INCLUDE_STATUS_INDICATOR === '1'
export const USE_MOCK_DATA =
  process.env.VERCEL_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_MOCK_DATA === '1'

export const INCLUDE_DASHBOARD_FEEDBACK_SURVEY =
  process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_FEEDBACK_SURVEY_ID &&
  process.env.NEXT_PUBLIC_POSTHOG_KEY

export const INCLUDE_REPORT_ISSUE =
  process.env.NEXT_PUBLIC_INCLUDE_REPORT_ISSUE === '1'

const CAPTCHA_ENABLED = process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === '1'

export const CAPTCHA_REQUIRED_CLIENT =
  CAPTCHA_ENABLED && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export const CAPTCHA_REQUIRED_SERVER =
  CAPTCHA_ENABLED &&
  !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
  !!process.env.TURNSTILE_SECRET_KEY

export function isOryAuthEnabled() {
  return process.env.AUTH_PROVIDER === 'ory'
}

// Freezes interactive auth entry points while we migrate identity stores.
// When on: blocks sign-ups and sign-ins so OAuth callback URLs can move
// between providers without sending users into broken provider flows.
export function isAuthMigrationInProgress() {
  return process.env.NEXT_PUBLIC_AUTH_MIGRATION_IN_PROGRESS === '1'
}

export const AUTH_MIGRATION_IN_PROGRESS = isAuthMigrationInProgress()

export type BooleanFeatureFlagDefinition = {
  kind: 'boolean'
  key: string
  defaultValue: boolean
  description?: string
}

export type JsonFeatureFlagDefinition<T> = {
  kind: 'json'
  key: string
  defaultValue: T
  schema: z.ZodType<T>
  description?: string
}

export type FeatureFlagDefinition =
  | BooleanFeatureFlagDefinition
  | JsonFeatureFlagDefinition<unknown>

export const FEATURE_FLAGS = {
  isAdmin: {
    kind: 'boolean',
    key: 'is_admin',
    defaultValue: false,
    description: 'Enables dashboard admin-only surfaces.',
  },
  iExist: {
    kind: 'boolean',
    key: 'i_exist',
    defaultValue: false,
    description: 'Test flag for validating LaunchDarkly team targeting.',
  },
  agentsDashboard: {
    kind: 'boolean',
    key: 'agents_dashboard',
    defaultValue: false,
    description: 'Enables direct dashboard access to agent templates.',
  },
} as const satisfies Record<string, FeatureFlagDefinition>
