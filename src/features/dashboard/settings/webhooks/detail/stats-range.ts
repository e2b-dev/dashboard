type WebhookStatsRange = '24h' | '7d' | '30d'

type WebhookStatsRangeBounds = {
  start: string
  end: string
}

const WEBHOOK_STATS_RANGE_LABELS: Record<WebhookStatsRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
}

const WEBHOOK_STATS_RANGE_HOURS: Record<WebhookStatsRange, number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
}

// Builds ISO stats bounds from a range, e.g. "24h" -> { start: "...", end: "..." }.
const getWebhookStatsRange = (
  range: WebhookStatsRange
): WebhookStatsRangeBounds => {
  const end = new Date()
  const start = new Date(
    end.getTime() - WEBHOOK_STATS_RANGE_HOURS[range] * 60 * 60 * 1000
  )

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export {
  getWebhookStatsRange,
  WEBHOOK_STATS_RANGE_LABELS,
  type WebhookStatsRange,
  type WebhookStatsRangeBounds,
}
