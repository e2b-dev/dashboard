export const SANDBOXES_METRICS_POLLING_MS = 5_000

export const SANDBOXES_DETAILS_METRICS_POLLING_MS = 3_000

export const TEAM_METRICS_INITIAL_RANGE_MS = 60 * 5 * 1_000 // 5 minutes

export const TEAM_METRICS_POLLING_INTERVAL_MS = 10_000

// how often to update the "now" timestamp for live mode
// this prevents constant URL updates from Date.now() changing
export const TEAM_METRICS_TIMEFRAME_UPDATE_MS = 10_000

// backend metrics collection interval
export const TEAM_METRICS_BACKEND_COLLECTION_INTERVAL_MS = 30_000

export const SINGLE_SANDBOX_RESOURCE_METRICS_TIMEFRAME_UPDATE_MS = 10_000
