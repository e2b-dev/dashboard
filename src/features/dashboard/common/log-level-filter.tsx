import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import type { LogLevelValue } from './log-cells'

const DEFAULT_OPTIONS: Array<{ value: LogLevelValue; label: string }> = [
  { value: 'debug', label: 'Debug' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error' },
]

interface LogLevelFilterProps {
  level: LogLevelValue | null
  onLevelChange: (level: LogLevelValue | null) => void
  options?: Array<{ value: LogLevelValue; label: string }>
  renderOption?: (level: LogLevelValue) => ReactNode
  className?: string
}

export function LogLevelFilter({
  level,
  onLevelChange,
  options = DEFAULT_OPTIONS,
  renderOption,
  className,
}: LogLevelFilterProps) {
  const selectedLevel = level ?? 'debug'
  const selectedLabel = options.find((o) => o.value === selectedLevel)?.label

  return (
    <div className={cn('flex w-full min-h-0 justify-between gap-3', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" className="w-min">
            <LevelIndicator level={selectedLevel} />
            Min Level · {selectedLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={selectedLevel}
            onValueChange={(value) => onLevelChange(value as LogLevelValue)}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {renderOption ? renderOption(option.value) : option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function LevelIndicator({ level }: { level: LogLevelValue }) {
  return (
    <div
      className={cn(
        'size-3.5 rounded-full bg-bg border-[1.5px] border-dashed',
        {
          'border-fg-tertiary': level === 'debug',
          'border-accent-info-highlight': level === 'info',
          'border-accent-warning-highlight': level === 'warn',
          'border-accent-error-highlight': level === 'error',
        }
      )}
    />
  )
}
