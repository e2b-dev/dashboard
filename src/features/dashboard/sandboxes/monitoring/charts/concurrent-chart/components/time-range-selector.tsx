import { cn } from '@/lib/utils'
import {
  TIME_RANGES,
  type TimeRangeKey,
  type TimeframeState,
} from '@/lib/utils/timeframe'
import { Button } from '@/ui/primitives/button'
import { TimePicker } from '../../../time-picker'

const CHART_RANGE_MAP = {
  custom: null,
  ...TIME_RANGES,
} as const

const CHART_RANGE_MAP_KEYS = Object.keys(CHART_RANGE_MAP) as Array<
  keyof typeof CHART_RANGE_MAP
>

interface Timeframe {
  start: number
  end: number
  isLive: boolean
  duration: number
}

interface TimeRangeSelectorProps {
  timeframe: Timeframe
  currentRange: string
  onTimeRangeChange: (range: TimeRangeKey) => void
  onCustomRangeChange: (start: number, end: number) => void
}

export function TimeRangeSelector({
  timeframe,
  currentRange,
  onTimeRangeChange,
  onCustomRangeChange,
}: TimeRangeSelectorProps) {
  const handleRangeChange = (range: keyof typeof CHART_RANGE_MAP) => {
    if (range === 'custom') return
    onTimeRangeChange(range as TimeRangeKey)
  }

  const handleTimePickerChange = (value: TimeframeState) => {
    if (value.mode === 'static' && value.start && value.end) {
      onCustomRangeChange(value.start, value.end)
    } else if (value.mode === 'live' && value.range) {
      const matchingRange = Object.entries(TIME_RANGES).find(
        ([_, rangeMs]) => rangeMs === value.range
      )

      if (matchingRange) {
        onTimeRangeChange(matchingRange[0] as TimeRangeKey)
      } else {
        const now = Date.now()
        onCustomRangeChange(now - value.range, now)
      }
    }
  }

  return (
    <div className="flex items-center gap-2 md:gap-4 max-md:-ml-1.5 max-md:pr-3 max-md:-mr-3 max-md:-mt-0.5 max-md:overflow-x-auto [&::-webkit-scrollbar]:hidden">
      <TimePicker
        value={{
          mode: timeframe.isLive ? 'live' : 'static',
          range: timeframe.duration,
          start: timeframe.start,
          end: timeframe.end,
        }}
        onValueChange={handleTimePickerChange}
      >
        <Button
          variant="tertiary"
          size="none"
          className={cn(
            'text-fg-tertiary hover:text-fg-secondary py-0.5 max-md:text-[11px] max-md:px-1.5 shrink-0 prose-label uppercase',
            {
              'text-fg prose-label-highlight': currentRange === 'custom',
            }
          )}
        >
          custom
        </Button>
      </TimePicker>

      {CHART_RANGE_MAP_KEYS.filter((key) => key !== 'custom').map((key) => (
        <Button
          key={key}
          variant="tertiary"
          size="none"
          className={cn(
            'text-fg-tertiary hover:text-fg-secondary py-0.5 max-md:text-[11px] max-md:px-1.5 shrink-0 prose-label uppercase',
            {
              'text-fg prose-label-highlight': currentRange === key,
            }
          )}
          onClick={() => handleRangeChange(key as keyof typeof CHART_RANGE_MAP)}
        >
          {key}
        </Button>
      ))}
    </div>
  )
}
