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
  environment?: 'production' | 'preview' | 'development'
}

export function getFeatureFlagEnvironment(): FeatureFlagContext['environment'] {
  switch (process.env.VERCEL_ENV) {
    case 'production':
    case 'preview':
    case 'development':
      return process.env.VERCEL_ENV
    default:
      return 'development'
  }
}
