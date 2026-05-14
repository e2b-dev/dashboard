import { createLoader, parseAsStringEnum } from 'nuqs/server'

const WEBHOOK_STATS_RANGE_VALUES = ['24h', '7d'] as const

type WebhookStatsRange = '24h' | '7d'

type WebhookStatsRangeBounds = {
  start: string
  end: string
}

const DEFAULT_WEBHOOK_STATS_RANGE: WebhookStatsRange = '24h'

const webhookStatsRangeParams = {
  range: parseAsStringEnum(WEBHOOK_STATS_RANGE_VALUES),
}

const loadWebhookStatsRangeParams = createLoader(webhookStatsRangeParams)

const WEBHOOK_STATS_RANGE_LABELS: Record<WebhookStatsRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
}

const WEBHOOK_STATS_RANGE_HOURS: Record<WebhookStatsRange, number> = {
  '24h': 24,
  '7d': 24 * 7,
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
  DEFAULT_WEBHOOK_STATS_RANGE,
  getWebhookStatsRange,
  loadWebhookStatsRangeParams,
  webhookStatsRangeParams,
  WEBHOOK_STATS_RANGE_LABELS,
  type WebhookStatsRange,
  type WebhookStatsRangeBounds,
}
