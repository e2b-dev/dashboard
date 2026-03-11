'use client'

import { RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { LiveDot } from '@/ui/live'
import { Button } from '@/ui/primitives/button'
import { TimeIcon } from '@/ui/primitives/icons'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'
import { Separator } from '@/ui/primitives/separator'
import { TimeRangePicker, type TimeRangeValues } from '@/ui/time-range-picker'
import { parseTimeRangeValuesToTimestamps } from '@/ui/time-range-picker.logic'
import { type TimeRangePreset, TimeRangePresets } from '@/ui/time-range-presets'
import {
  SANDBOX_MONITORING_LIFECYCLE_PADDING_MS,
  SANDBOX_MONITORING_TIME_LABEL_FORMAT_OPTIONS,
} from '../utils/constants'
import { findPresetById, getMonitoringPresets } from '../utils/presets'
import {
  clampTimeframeToBounds,
  type SandboxLifecycleBounds,
} from '../utils/timeframe'

function isValidDate(date: Date): boolean {
  return Number.isFinite(date.getTime())
}

function toSafeIsoDateTime(
  timestampMs: number,
  fallbackTimestampMs: number = Date.now()
): string {
  const candidate = new Date(timestampMs)
  if (isValidDate(candidate)) {
    return candidate.toISOString()
  }

  return new Date(fallbackTimestampMs).toISOString()
}

const rangeLabelFormatter = new Intl.DateTimeFormat(
  undefined,
  SANDBOX_MONITORING_TIME_LABEL_FORMAT_OPTIONS
)

interface SandboxMonitoringTimeRangeControlsProps {
  timeframe: {
    start: number
    end: number
  }
  lifecycle: SandboxLifecycleBounds
  isLiveUpdating: boolean
  activePresetId: string | null
  onPresetSelect: (id: string) => void
  onCustomTimeRange: (start: number, end: number) => void
  canResetZoom: boolean
  onResetZoom: () => void
  className?: string
}

export default function SandboxMonitoringTimeRangeControls({
  timeframe,
  lifecycle,
  isLiveUpdating,
  activePresetId,
  onPresetSelect,
  onCustomTimeRange,
  canResetZoom,
  onResetZoom,
  className,
}: SandboxMonitoringTimeRangeControlsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pickerMaxDateMs, setPickerMaxDateMs] = useState(() => Date.now())

  const clampToLifecycle = useCallback(
    (start: number, end: number) => {
      const maxBoundMs = lifecycle.isRunning
        ? Date.now()
        : lifecycle.anchorEndMs

      return clampTimeframeToBounds(
        start,
        end,
        lifecycle.startMs - SANDBOX_MONITORING_LIFECYCLE_PADDING_MS,
        maxBoundMs + SANDBOX_MONITORING_LIFECYCLE_PADDING_MS
      )
    },
    [lifecycle.anchorEndMs, lifecycle.isRunning, lifecycle.startMs]
  )

  const presets = useMemo<TimeRangePreset[]>(
    () => getMonitoringPresets(lifecycle),
    [lifecycle]
  )

  const activePresetLabel = useMemo(() => {
    if (activePresetId === null) {
      return null
    }
    const preset = findPresetById(presets, activePresetId)
    return preset?.label ?? null
  }, [activePresetId, presets])

  const rangeLabel = useMemo(() => {
    const startDate = new Date(timeframe.start)
    const endDate = new Date(timeframe.end)
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return '--'
    }

    return `${rangeLabelFormatter.format(startDate)} - ${rangeLabelFormatter.format(
      endDate
    )}`
  }, [timeframe.end, timeframe.start])

  useEffect(() => {
    if (isOpen && lifecycle.isRunning) {
      setPickerMaxDateMs(Date.now())
    }
  }, [isOpen, lifecycle.isRunning])

  const pickerMaxDate = useMemo(
    () =>
      lifecycle.isRunning
        ? new Date(pickerMaxDateMs + SANDBOX_MONITORING_LIFECYCLE_PADDING_MS)
        : new Date(
            lifecycle.anchorEndMs + SANDBOX_MONITORING_LIFECYCLE_PADDING_MS
          ),
    [lifecycle.anchorEndMs, lifecycle.isRunning, pickerMaxDateMs]
  )

  const pickerBounds = useMemo(
    () => ({
      min: new Date(
        lifecycle.startMs - SANDBOX_MONITORING_LIFECYCLE_PADDING_MS
      ),
      max: pickerMaxDate,
    }),
    [lifecycle.startMs, pickerMaxDate]
  )

  const handlePresetSelect = useCallback(
    (preset: TimeRangePreset) => {
      onPresetSelect(preset.id)
      setIsOpen(false)
    },
    [onPresetSelect]
  )

  const handleApply = useCallback(
    (values: TimeRangeValues) => {
      const timestamps = parseTimeRangeValuesToTimestamps(values)
      if (!timestamps) {
        return
      }

      const next = clampToLifecycle(timestamps.start, timestamps.end)

      onCustomTimeRange(next.start, next.end)
      setIsOpen(false)
    },
    [clampToLifecycle, onCustomTimeRange]
  )

  const buttonLabel = activePresetLabel ?? rangeLabel

  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-center gap-3 justify-start',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              size="md"
              variant="outline"
              className="prose-label-highlight font-sans"
            >
              {isLiveUpdating ? (
                <LiveDot paused={false} />
              ) : (
                <TimeIcon className="size-4 text-fg-tertiary" />
              )}{' '}
              {buttonLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 max-md:w-[calc(100vw-2rem)]">
            <div className="flex max-md:flex-col max-h-[500px] max-md:max-h-[600px]">
              <TimeRangePicker
                startDateTime={toSafeIsoDateTime(
                  timeframe.start,
                  timeframe.end
                )}
                endDateTime={toSafeIsoDateTime(timeframe.end)}
                bounds={pickerBounds}
                onApply={handleApply}
                className="p-3 w-56 max-md:w-full"
              />
              <Separator
                orientation="vertical"
                className="h-auto max-md:hidden text-fg-tertiary"
              />
              <Separator
                orientation="horizontal"
                className="w-auto md:hidden"
              />
              <TimeRangePresets
                presets={presets}
                selectedId={activePresetId ?? undefined}
                onSelect={handlePresetSelect}
                className="w-56 max-md:w-full p-3"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {canResetZoom ? (
        <div className="flex items-center gap-1">
          <Button
            size="md"
            variant="outline"
            onClick={onResetZoom}
            title="Reset zoom"
            aria-label="Reset zoom"
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
