export type DashboardFeatures = {
  isAdmin: boolean
}

export const DEFAULT_DASHBOARD_FEATURES = {
  isAdmin: false,
} satisfies DashboardFeatures

export type DashboardFeatureKey = keyof DashboardFeatures
