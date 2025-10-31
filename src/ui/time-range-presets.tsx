/**
 * Time range preset selector component
 * Provides radio selection for common time range presets
 */

'use client'

import { cn } from '@/lib/utils'
import { useCallback } from 'react'
import { Label } from './primitives/label'
import { RadioGroup, RadioGroupItem } from './primitives/radio-group'
import { ScrollArea } from './primitives/scroll-area'

export interface TimeRangePreset {
  id: string
  label: string
  shortcut?: string
  description?: string
  getValue: () => { start: number; end: number }
}

interface TimeRangePresetsProps {
  presets: TimeRangePreset[]
  onSelect?: (preset: TimeRangePreset) => void
  selectedId?: string
  className?: string
}

export function TimeRangePresets({
  presets,
  onSelect,
  selectedId,
  className,
}: TimeRangePresetsProps) {
  const handleValueChange = useCallback(
    (value: string) => {
      const preset = presets.find((p) => p.id === value)
      if (preset && onSelect) {
        onSelect(preset)
      }
    },
    [presets, onSelect]
  )

  return (
    <div className={cn('flex flex-col h-full gap-2', className)}>
      <Label className="prose-label uppercase text-fg-tertiary block">
        Presets
      </Label>
      <ScrollArea className="flex-1">
        <RadioGroup
          value={selectedId}
          onValueChange={handleValueChange}
          className="gap-0"
        >
          {presets.map((preset) => (
            <label
              key={preset.id}
              htmlFor={preset.id}
              className={cn(
                'relative prose-body flex cursor-pointer select-none items-center justify-between gap-2',
                'px-2 py-1.5',
                'outline-none',
                'focus-within:bg-bg-highlight hover:bg-bg-highlight',
                'transition-colors'
              )}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value={preset.id} id={preset.id} />
                <span className="prose-body">{preset.label}</span>
              </div>
              {preset.shortcut && (
                <span className="font-mono uppercase prose-label text-fg-tertiary">
                  {preset.shortcut}
                </span>
              )}
            </label>
          ))}
        </RadioGroup>
      </ScrollArea>
    </div>
  )
}
