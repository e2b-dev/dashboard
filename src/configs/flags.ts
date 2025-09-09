export const ALLOW_SEO_INDEXING = process.env.ALLOW_SEO_INDEXING === '1'
export const VERBOSE = process.env.NEXT_PUBLIC_VERBOSE === '1'
export const INCLUDE_BILLING = process.env.NEXT_PUBLIC_INCLUDE_BILLING === '1'
export const ENABLE_SIGN_UP_RATE_LIMITING =
  process.env.ENABLE_SIGN_UP_RATE_LIMITING === '1' &&
  process.env.KV_REST_API_URL &&
  process.env.KV_REST_API_TOKEN
