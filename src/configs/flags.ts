export const ALLOW_SEO_INDEXING = process.env.ALLOW_SEO_INDEXING === '1'
export const USE_BOT_ID = process.env.NEXT_PUBLIC_USE_BOT_ID === '1'
export const VERBOSE = process.env.NEXT_PUBLIC_VERBOSE === '1'
export const INCLUDE_BILLING = process.env.NEXT_PUBLIC_INCLUDE_BILLING === '1'
export const USE_MOCK_DATA =
  process.env.VERCEL_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_MOCK_DATA === '1'
