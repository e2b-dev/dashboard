export type FeatureFlagContextInput = {
  // Optional: user-targeted flags pass the authenticated user id, but
  // environment/release flags (e.g. evaluated pre-auth) can omit it. Providers
  // fall back to an anonymous identifier when absent.
  userId?: string
  teamId?: string
}
