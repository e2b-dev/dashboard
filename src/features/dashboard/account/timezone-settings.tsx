'use client'

import { useMemo, useState } from 'react'
import {
  formatTimezoneLabel,
  getBrowserTimezone,
  getTimezones,
  type Timezone,
  useTimezone,
} from '@/features/dashboard/timezone'
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

export const TimezoneSettings = ({ className }: TimezoneSettingsProps) => {
  const { timezone, setTimezone } = useTimezone()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const browserTimezone = useMemo(() => getBrowserTimezone(), [])
  const timezoneOptions = useMemo(
    () =>
      getTimezones().map((option) => ({
        value: option,
        label: formatTimezoneLabel(option),
      })),
    []
  )
  const timezoneLabel = useMemo(() => formatTimezoneLabel(timezone), [timezone])
  const browserTimezoneLabel = useMemo(
    () => formatTimezoneLabel(browserTimezone),
    [browserTimezone]
  )
  const isBrowserTimezoneSelected = timezone === browserTimezone

  const handleTimezoneSelect = async (nextTimezone: Timezone) => {
    if (nextTimezone === timezone) {
      setOpen(false)
      return
    }

    setIsSaving(true)
    const didSave = await setTimezone(nextTimezone)
    setIsSaving(false)

    if (!didSave) {
      toast(defaultErrorToast('Failed to update timezone preference.'))
      return
    }

    toast(defaultSuccessToast('Timezone updated.'))
    setOpen(false)
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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              loading={isSaving ? 'Saving...' : undefined}
              className="w-full max-w-[24rem] justify-between font-mono"
            >
              {timezoneLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[24rem] max-w-[calc(100vw-2rem)] p-0">
            <Command>
              <CommandInput placeholder="Search timezones..." />
              <CommandList>
                <CommandEmpty>No timezones found.</CommandEmpty>
                {timezoneOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
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
        {!isBrowserTimezoneSelected ? (
          <Button
            type="button"
            variant="secondary"
            loading={isSaving ? 'Saving...' : undefined}
            onClick={() => void handleTimezoneSelect(browserTimezone)}
          >
            Use browser timezone
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  )
}
