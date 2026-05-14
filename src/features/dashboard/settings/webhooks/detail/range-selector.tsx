'use client'

import { z } from 'zod'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select'
import {
  WEBHOOK_STATS_RANGE_LABELS,
  type WebhookStatsRange,
} from './stats-range'

const WebhookStatsRangeSchema = z.enum(['24h', '7d'])

type WebhookRangeSelectorProps = {
  value: WebhookStatsRange
  onChange: (value: WebhookStatsRange) => void
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
