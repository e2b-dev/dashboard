'use client'

import { z } from 'zod'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select'

export type WebhookStatsRange = '24h' | '7d' | '30d'

const WebhookStatsRangeSchema = z.enum(['24h', '7d', '30d'])

export const WEBHOOK_STATS_RANGE_LABELS: Record<WebhookStatsRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
}

const WEBHOOK_STATS_RANGE_HOURS: Record<WebhookStatsRange, number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
}

type WebhookRangeSelectorProps = {
  value: WebhookStatsRange
  onChange: (value: WebhookStatsRange) => void
}

// Builds ISO stats bounds from a range, e.g. "24h" -> { start: "...", end: "..." }.
export const getWebhookStatsRange = (range: WebhookStatsRange) => {
  const end = new Date()
  const start = new Date(
    end.getTime() - WEBHOOK_STATS_RANGE_HOURS[range] * 60 * 60 * 1000
  )

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export const WebhookRangeSelector = ({
  value,
  onChange,
}: WebhookRangeSelectorProps) => {
  const handleValueChange = (nextValue: string) => {
    const parsed = WebhookStatsRangeSchema.safeParse(nextValue)
    if (!parsed.success) return

    onChange(parsed.data)
  }

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className="h-9 w-full md:w-[164px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(WEBHOOK_STATS_RANGE_LABELS).map(([range, label]) => (
          <SelectItem key={range} value={range}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
