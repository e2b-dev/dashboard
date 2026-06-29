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
}
