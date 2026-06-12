'use client'

import { useCallback, useMemo, useState } from 'react'
import { formatDate, useTimezone } from '@/features/dashboard/timezone'
import { cn } from '@/lib/utils'
import { LiveDot } from '@/ui/live'
import { Button } from '@/ui/primitives/button'
import { IconButton } from '@/ui/primitives/icon-button'
import { RefreshIcon, TimeIcon } from '@/ui/primitives/icons'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'
import { Separator } from '@/ui/primitives/separator'
import { TimeRangePicker } from '@/ui/time-range-picker'
import { type TimeRangePreset, TimeRangePresets } from '@/ui/time-range-presets'
import { SANDBOX_MONITORING_CUSTOM_END_FUTURE_MS } from '../utils/constants'
import { findPresetById, getMonitoringPresets } from '../utils/presets'
import {
  computeLifecyclePadding,
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

interface SandboxMonitoringTimeRangeControlsProps {
  timeframe: {
    start: number
    end: number
  }
  lifecycle: SandboxLifecycleBounds
  isPolling: boolean
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
  isPolling,
  activePresetId,
  onPresetSelect,
  onCustomTimeRange,
  canResetZoom,
  onResetZoom,
  className,
}: SandboxMonitoringTimeRangeControlsProps) {
  const { timezone } = useTimezone()
  const [isOpen, setIsOpen] = useState(false)
  const [pickerMaxDateMs, setPickerMaxDateMs] = useState(() => Date.now())
  const [pickerTimeframe, setPickerTimeframe] = useState(timeframe)

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setPickerTimeframe(timeframe)
        if (lifecycle.isRunning) {
          setPickerMaxDateMs(Date.now())
        }
      }
      setIsOpen(open)
    },
    [lifecycle.isRunning, timeframe]
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

    const startLabel = formatDate(startDate, {
      timezone,
      format: 'time-24h',
    })
    const endLabel = formatDate(endDate, { timezone, format: 'time-24h' })

    return `${startLabel} - ${endLabel}`
  }, [timeframe.end, timeframe.start, timezone])

  const lifecyclePadding = useMemo(() => {
    const anchorEndMs = lifecycle.isRunning
      ? pickerMaxDateMs
      : lifecycle.anchorEndMs
    return computeLifecyclePadding(anchorEndMs - lifecycle.startMs)
  }, [
    lifecycle.anchorEndMs,
    lifecycle.isRunning,
    lifecycle.startMs,
    pickerMaxDateMs,
  ])

  const pickerMaxDate = useMemo(
    () =>
      lifecycle.isRunning
        ? new Date(
            pickerMaxDateMs +
              lifecyclePadding +
              SANDBOX_MONITORING_CUSTOM_END_FUTURE_MS
          )
        : new Date(
            lifecycle.anchorEndMs +
              lifecyclePadding +
              SANDBOX_MONITORING_CUSTOM_END_FUTURE_MS
          ),
    [
      lifecycle.anchorEndMs,
      lifecycle.isRunning,
      lifecyclePadding,
      pickerMaxDateMs,
    ]
  )

  const pickerBounds = useMemo(
    () => ({
      min: new Date(lifecycle.startMs - lifecyclePadding),
      max: pickerMaxDate,
    }),
    [lifecycle.startMs, lifecyclePadding, pickerMaxDate]
  )

  const handlePresetSelect = useCallback(
    (preset: TimeRangePreset) => {
      onPresetSelect(preset.id)
      setIsOpen(false)
    },
    [onPresetSelect]
  )

  const handleApply = useCallback(
    (start: number, end: number) => {
      onCustomTimeRange(start, end)
      setIsOpen(false)
    },
    [onCustomTimeRange]
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
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              className="prose-label-highlight font-sans"
            >
              {isPolling ? (
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
                  pickerTimeframe.start,
                  pickerTimeframe.end
                )}
                endDateTime={toSafeIsoDateTime(pickerTimeframe.end)}
                bounds={pickerBounds}
                onApply={({ start, end }) => handleApply(start, end)}
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
          <IconButton
            onClick={onResetZoom}
            title="Reset zoom"
            aria-label="Reset zoom"
          >
            <RefreshIcon />
          </IconButton>
        </div>
      ) : null}
    </div>
  )
}
