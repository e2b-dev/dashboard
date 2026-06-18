export type FeatureFlagContext = {
  user: {
    id: string
    email?: string
  }
  team?: {
    id: string
    slug?: string
    name?: string
  }
  environment?: 'production' | 'staging'
}

export function getFeatureFlagEnvironment(): FeatureFlagContext['environment'] {
  switch (process.env.FEATURE_FLAG_ENVIRONMENT) {
    case 'production':
    case 'staging':
      return process.env.FEATURE_FLAG_ENVIRONMENT
  }

  switch (process.env.VERCEL_ENV) {
    case 'production':
      return 'production'
    default:
      return 'staging'
  }
}
