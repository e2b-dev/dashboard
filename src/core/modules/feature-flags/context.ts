export type FeatureFlagContext = {
  user: {
    id: string
    email?: string
  }
  team?: {
    id: string
    name?: string
  }
}
