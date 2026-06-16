'use client'

import { useEffect, useMemo, useState } from 'react'
import { type Timezone, useTimezone } from '@/features/dashboard/timezone'
import {
  formatTimezoneLabel,
  getBrowserTimezone,
  getTimezones,
} from '@/features/dashboard/timezone/utils'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/primitives/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'

interface TimezoneSettingsProps {
  className?: string
}

const TIMEZONE_SAVE_SETTLE_DELAY_MS = 300

export const TimezoneSettings = ({ className }: TimezoneSettingsProps) => {
  const { timezone, setTimezone } = useTimezone()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [browserTimezone, setBrowserTimezone] = useState<Timezone | null>(null)
  const [availableTimezones, setAvailableTimezones] = useState<Timezone[]>([
    timezone,
  ])

  useEffect(() => {
    const detectedBrowserTimezone = getBrowserTimezone()
    setBrowserTimezone(detectedBrowserTimezone)
    setAvailableTimezones(
      Array.from(
        new Set([timezone, detectedBrowserTimezone, ...getTimezones()])
      )
    )
  }, [timezone])

  const timezoneOptions = useMemo(
    () =>
      availableTimezones.map((option) => ({
        value: option,
        label: formatTimezoneLabel(option),
      })),
    [availableTimezones]
  )
  const timezoneLabel = useMemo(() => formatTimezoneLabel(timezone), [timezone])
  const browserTimezoneLabel = useMemo(
    () =>
      browserTimezone ? formatTimezoneLabel(browserTimezone) : 'Detecting...',
    [browserTimezone]
  )
  const isBrowserTimezoneSelected = timezone === browserTimezone
  const showUseBrowserTimezoneButton =
    Boolean(browserTimezone) && !isBrowserTimezoneSelected

  const handleTimezoneSelect = async (nextTimezone: Timezone) => {
    if (isSaving) return

    if (nextTimezone === timezone) {
      setOpen(false)
      return
    }

    setIsSaving(true)
    setOpen(false)
    const didSave = await setTimezone(nextTimezone)

    await new Promise((resolve) =>
      window.setTimeout(resolve, TIMEZONE_SAVE_SETTLE_DELAY_MS)
    )
    setIsSaving(false)

    if (!didSave) {
      toast(defaultErrorToast('Failed to update timezone preference.'))
      return
    }

    toast(defaultSuccessToast('Timezone updated.'))
  }

  return (
    <Card
      className={cn('overflow-hidden border-b md:border', className)}
      hideUnderline
    >
      <CardHeader>
        <CardTitle>Timezone</CardTitle>
        <CardDescription>
          Choose how dashboard time ranges, charts, and timestamp labels should
          be displayed.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <Popover
          open={open}
          onOpenChange={(nextOpen) => {
            if (!isSaving) setOpen(nextOpen)
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              disabled={isSaving}
              className="w-full max-w-[24rem] justify-between font-mono"
            >
              {timezoneLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            avoidCollisions={false}
            className="w-[24rem] max-w-[calc(100vw-2rem)] p-0"
          >
            <Command className="flex-col-reverse **:[[cmdk-input-wrapper]]:border-t **:[[cmdk-input-wrapper]]:border-b-0">
              <CommandInput placeholder="Search timezones..." />
              <CommandList>
                <CommandEmpty>No timezones found.</CommandEmpty>
                {timezoneOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    disabled={isSaving}
                    onSelect={() => void handleTimezoneSelect(option.value)}
                    className="justify-between"
                  >
                    <span>{option.label}</span>
                    {option.value === timezone ? (
                      <span className="text-accent-main-highlight">
                        Selected
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </CardContent>

      <CardFooter className="bg-bg-1 justify-between gap-3">
        <p className="text-fg-tertiary">
          Browser timezone:{' '}
          <span className="font-mono">{browserTimezoneLabel}</span>
        </p>
        <div className="flex min-h-9 min-w-49 justify-end">
          <Button
            type="button"
            variant="secondary"
            className={cn(!showUseBrowserTimezoneButton && 'invisible')}
            disabled={!showUseBrowserTimezoneButton || isSaving}
            aria-hidden={!showUseBrowserTimezoneButton}
            tabIndex={
              showUseBrowserTimezoneButton && !isSaving ? undefined : -1
            }
            onClick={() => {
              if (browserTimezone) void handleTimezoneSelect(browserTimezone)
            }}
          >
            Use browser timezone
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
