'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select'
import {
  isWebhookStatsRange,
  WEBHOOK_STATS_RANGE_OPTIONS,
  type WebhookStatsRange,
} from './stats-range'

type WebhookRangeSelectorProps = {
  value: WebhookStatsRange
  onChange: (value: WebhookStatsRange) => void
}

export const WebhookRangeSelector = ({
  value,
  onChange,
}: WebhookRangeSelectorProps) => {
  const handleValueChange = (nextValue: string) => {
    if (!isWebhookStatsRange(nextValue)) return

    onChange(nextValue)
  }

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className="h-9 w-full border-solid font-sans normal-case md:w-[164px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {WEBHOOK_STATS_RANGE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
