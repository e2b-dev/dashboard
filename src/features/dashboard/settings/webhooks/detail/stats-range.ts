import { createLoader, parseAsInteger } from 'nuqs/server'
import type { WebhookStatsBucketIntervalSeconds } from '@/core/server/functions/webhooks/schema'

type WebhookStatsRangeBounds = {
  start: number
  end: number
}

type WebhookStatsApiBounds = {
  bucketIntervalSeconds: WebhookStatsBucketIntervalSeconds
  start: string
  end: string
}

const MAX_WEBHOOK_STATS_RANGE_MS = 7 * 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const webhookStatsTimeframeParams = {
  start: parseAsInteger,
  end: parseAsInteger,
}

const loadWebhookStatsTimeframeParams = createLoader(
  webhookStatsTimeframeParams
)

const getStableNow = () => {
  const now = Date.now()
  return Math.floor(now / 1_000) * 1_000
}

const getStartOfDay = (timestamp: number) => {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const WEBHOOK_STATS_RANGE_OPTIONS = [
  {
    value: '4h',
    label: 'Last 4 hours',
    getStart: (end: number) => end - 4 * 60 * 60 * 1000,
  },
  {
    value: '12h',
    label: 'Last 12 hours',
    getStart: (end: number) => end - 12 * 60 * 60 * 1000,
  },
  { value: 'today', label: 'Today', getStart: getStartOfDay },
  {
    value: 'this-week',
    label: 'Last 7 days',
    getStart: (end: number) => end - 7 * 24 * 60 * 60 * 1000,
  },
] as const

const WEBHOOK_STATS_RANGE_VALUES = WEBHOOK_STATS_RANGE_OPTIONS.map(
  (option) => option.value
) as [WebhookStatsRange, ...WebhookStatsRange[]]

type WebhookStatsRange = (typeof WEBHOOK_STATS_RANGE_OPTIONS)[number]['value']

const DEFAULT_WEBHOOK_STATS_RANGE: WebhookStatsRange = 'this-week'

const getWebhookStatsRangeOption = (range: WebhookStatsRange) => {
  const matchedOption = WEBHOOK_STATS_RANGE_OPTIONS.find(
    (option) => option.value === range
  )
  if (matchedOption) return matchedOption

  return WEBHOOK_STATS_RANGE_OPTIONS[0]
}

const isWebhookStatsRange = (range: string): range is WebhookStatsRange =>
  WEBHOOK_STATS_RANGE_OPTIONS.some((option) => option.value === range)

// Builds millisecond stats bounds from a range, e.g. "4h" -> { start: 177..., end: 177... }.
const getWebhookStatsRange = (
  range: WebhookStatsRange
): WebhookStatsRangeBounds => {
  const end = getStableNow()
  const option = getWebhookStatsRangeOption(range)

  return {
    start: option.getStart(end),
    end,
  }
}

const getWebhookStatsApiBounds = ({
  start,
  end,
}: WebhookStatsRangeBounds): WebhookStatsApiBounds => ({
  bucketIntervalSeconds: getWebhookStatsBucketIntervalSeconds({ start, end }),
  start: new Date(start).toISOString(),
  end: new Date(end).toISOString(),
})

// Picks the API bucket size for a range, e.g. a 12h range -> 600 seconds.
const getWebhookStatsBucketIntervalSeconds = ({
  start,
  end,
}: WebhookStatsRangeBounds): WebhookStatsBucketIntervalSeconds => {
  const rangeMs = end - start
  if (rangeMs <= HOUR_MS) return 60
  if (rangeMs <= 12 * HOUR_MS) return 600
  if (rangeMs <= DAY_MS) return 1800

  return 86400
}

const getWebhookStatsRangeFromBounds = ({
  start,
  end,
}: WebhookStatsRangeBounds): WebhookStatsRange => {
  return (
    WEBHOOK_STATS_RANGE_OPTIONS.find(
      (option) => Math.abs(option.getStart(end) - start) < 60_000
    )?.value ?? DEFAULT_WEBHOOK_STATS_RANGE
  )
}

const getValidWebhookStatsBounds = ({
  start,
  end,
}: Partial<WebhookStatsRangeBounds>): WebhookStatsRangeBounds =>
  start && end && end > start && end - start <= MAX_WEBHOOK_STATS_RANGE_MS
    ? { start, end }
    : getWebhookStatsRange(DEFAULT_WEBHOOK_STATS_RANGE)

export {
  DEFAULT_WEBHOOK_STATS_RANGE,
  getWebhookStatsApiBounds,
  getWebhookStatsBucketIntervalSeconds,
  getWebhookStatsRange,
  getWebhookStatsRangeFromBounds,
  getValidWebhookStatsBounds,
  isWebhookStatsRange,
  loadWebhookStatsTimeframeParams,
  webhookStatsTimeframeParams,
  WEBHOOK_STATS_RANGE_OPTIONS,
  WEBHOOK_STATS_RANGE_VALUES,
  type WebhookStatsApiBounds,
  type WebhookStatsRange,
  type WebhookStatsRangeBounds,
}
