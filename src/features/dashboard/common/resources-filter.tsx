'use client'

import { cn } from '@/lib/utils'
import { NumberInput } from '@/ui/number-input'
import { Button } from '@/ui/primitives/button'
import { Label } from '@/ui/primitives/label'
import { Separator } from '@/ui/primitives/separator'

export interface ResourcesFilterValue {
  cpuCount?: number
  memoryMB?: number
}

interface ResourcesFilterProps {
  value: ResourcesFilterValue
  onChange: (value: ResourcesFilterValue) => void
  className?: string
}

const formatMemoryDisplay = (memoryValue: number) => {
  if (memoryValue === 0) return 'Unfiltered'

  return memoryValue < 1024 ? `${memoryValue} MB` : `${memoryValue / 1024} GB`
}

/**
 * State-agnostic CPU + memory filter. The parent owns the value (URL params,
 * a store, …) and is responsible for any debouncing.
 */
export function ResourcesFilter({
  value,
  onChange,
  className,
}: ResourcesFilterProps) {
  const cpu = value.cpuCount ?? 0
  const memory = value.memoryMB ?? 0

  const handleCpuChange = (next: number) => {
    onChange({ cpuCount: next || undefined, memoryMB: value.memoryMB })
  }

  const handleMemoryChange = (next: number) => {
    onChange({ cpuCount: value.cpuCount, memoryMB: next || undefined })
  }

  return (
    <div className={cn('w-80 p-4', className)}>
      <div className="grid gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>CPU Cores</Label>
            <span className="text-accent-main-highlight text-xs">
              {cpu === 0 ? 'Unfiltered' : `${cpu} core${cpu === 1 ? '' : 's'}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NumberInput
              value={cpu}
              onChange={handleCpuChange}
              min={0}
              max={8}
              step={1}
              className="w-full"
            />
            {cpu > 0 && (
              <Button
                variant="secondary"
                onClick={() => handleCpuChange(0)}
                className="h-9 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        <Separator />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Memory</Label>
            <span className="text-accent-main-highlight text-xs">
              {formatMemoryDisplay(memory)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NumberInput
              value={memory}
              onChange={handleMemoryChange}
              min={0}
              max={8192}
              step={512}
              className="w-full"
            />
            {memory > 0 && (
              <Button variant="secondary" onClick={() => handleMemoryChange(0)}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
