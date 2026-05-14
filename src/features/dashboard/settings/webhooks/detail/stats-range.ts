import { createLoader, parseAsInteger } from 'nuqs/server'

const WEBHOOK_STATS_RANGE_VALUES = ['24h', '7d'] as const

type WebhookStatsRange = '24h' | '7d'

type WebhookStatsRangeBounds = {
  start: number
  end: number
}

type WebhookStatsApiBounds = {
  start: string
  end: string
}

const DEFAULT_WEBHOOK_STATS_RANGE: WebhookStatsRange = '24h'

const webhookStatsTimeframeParams = {
  start: parseAsInteger,
  end: parseAsInteger,
}

const loadWebhookStatsTimeframeParams = createLoader(
  webhookStatsTimeframeParams
)

const WEBHOOK_STATS_RANGE_LABELS: Record<WebhookStatsRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
}

const WEBHOOK_STATS_RANGE_HOURS: Record<WebhookStatsRange, number> = {
  '24h': 24,
  '7d': 24 * 7,
}

const WEBHOOK_STATS_RANGE_MS: Record<WebhookStatsRange, number> = {
  '24h': WEBHOOK_STATS_RANGE_HOURS['24h'] * 60 * 60 * 1000,
  '7d': WEBHOOK_STATS_RANGE_HOURS['7d'] * 60 * 60 * 1000,
}

const getStableNow = () => {
  const now = Date.now()
  return Math.floor(now / 1_000) * 1_000
}

// Builds millisecond stats bounds from a range, e.g. "24h" -> { start: 177..., end: 177... }.
const getWebhookStatsRange = (
  range: WebhookStatsRange
): WebhookStatsRangeBounds => {
  const end = getStableNow()

  return {
    start: end - WEBHOOK_STATS_RANGE_MS[range],
    end,
  }
}

const getWebhookStatsApiBounds = ({
  start,
  end,
}: WebhookStatsRangeBounds): WebhookStatsApiBounds => ({
  start: new Date(start).toISOString(),
  end: new Date(end).toISOString(),
})

const getWebhookStatsRangeFromBounds = ({
  start,
  end,
}: WebhookStatsRangeBounds): WebhookStatsRange => {
  const duration = end - start
  const matchedRange = WEBHOOK_STATS_RANGE_VALUES.find(
    (range) => Math.abs(WEBHOOK_STATS_RANGE_MS[range] - duration) < 60_000
  )

  return matchedRange ?? DEFAULT_WEBHOOK_STATS_RANGE
}

const normalizeWebhookStatsRangeBounds = (
  bounds: Partial<WebhookStatsRangeBounds>
): WebhookStatsRangeBounds => {
  if (!bounds.start || !bounds.end || bounds.end <= bounds.start) {
    return getWebhookStatsRange(DEFAULT_WEBHOOK_STATS_RANGE)
  }

  return {
    start: bounds.start,
    end: bounds.end,
  }
}

export {
  DEFAULT_WEBHOOK_STATS_RANGE,
  getWebhookStatsApiBounds,
  getWebhookStatsRange,
  getWebhookStatsRangeFromBounds,
  loadWebhookStatsTimeframeParams,
  normalizeWebhookStatsRangeBounds,
  webhookStatsTimeframeParams,
  WEBHOOK_STATS_RANGE_LABELS,
  type WebhookStatsApiBounds,
  type WebhookStatsRange,
  type WebhookStatsRangeBounds,
}
