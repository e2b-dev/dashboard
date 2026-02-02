export const ALLOW_SEO_INDEXING = process.env.ALLOW_SEO_INDEXING === '1'
export const VERBOSE = process.env.NEXT_PUBLIC_VERBOSE === '1'
export const INCLUDE_BILLING = process.env.NEXT_PUBLIC_INCLUDE_BILLING === '1'
export const INCLUDE_ARGUS = process.env.NEXT_PUBLIC_INCLUDE_ARGUS === '1'
export const USE_MOCK_DATA =
  process.env.VERCEL_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_MOCK_DATA === '1'

export const INCLUDE_DASHBOARD_FEEDBACK_SURVEY =
  process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_FEEDBACK_SURVEY_ID &&
  process.env.NEXT_PUBLIC_POSTHOG_KEY

const CAPTCHA_ENABLED = process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === '1'

export const CAPTCHA_REQUIRED_CLIENT =
  CAPTCHA_ENABLED && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export const CAPTCHA_REQUIRED_SERVER =
  CAPTCHA_ENABLED &&
  !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
  !!process.env.TURNSTILE_SECRET_KEY
