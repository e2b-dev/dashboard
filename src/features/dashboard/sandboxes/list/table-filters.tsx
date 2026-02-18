import { useSandboxTableStore } from '@/features/dashboard/sandboxes/list/stores/table-store'
import { cn } from '@/lib/utils'
import { formatCPUCores, formatMemory } from '@/lib/utils/formatting'
import { NumberInput } from '@/ui/number-input'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { Input } from '@/ui/primitives/input'
import { Label } from '@/ui/primitives/label'
import { Separator } from '@/ui/primitives/separator'
import { TableFilterButton } from '@/ui/table-filter-button'
import { ListFilter, Plus } from 'lucide-react'
import * as React from 'react'
import { memo, useCallback } from 'react'
import { useDebounceValue } from 'usehooks-ts'

export type StartedAtFilter = '1h ago' | '6h ago' | '12h ago' | undefined

// Components
const RunningSinceFilter = memo(function RunningSinceFilter() {
  const { startedAtFilter, setStartedAtFilter } = useSandboxTableStore()

  const handleRunningSince = useCallback(
    (value?: StartedAtFilter) => {
      if (!value) {
        setStartedAtFilter(undefined)
      } else {
        setStartedAtFilter(value)
      }
    },
    [setStartedAtFilter]
  )

  return (
    <div>
      <DropdownMenuItem
        className={cn(
          startedAtFilter === '1h ago' && 'text-accent-main-highlight '
        )}
        onClick={(e) => {
          e.preventDefault()
          handleRunningSince('1h ago')
        }}
      >
        1 hour ago
      </DropdownMenuItem>
      <DropdownMenuItem
        className={cn(
          startedAtFilter === '6h ago' && 'text-accent-main-highlight '
        )}
        onClick={(e) => {
          e.preventDefault()
          handleRunningSince('6h ago')
        }}
      >
        6 hours ago
      </DropdownMenuItem>
      <DropdownMenuItem
        className={cn(
          startedAtFilter === '12h ago' && 'text-accent-main-highlight '
        )}
        onClick={(e) => {
          e.preventDefault()
          handleRunningSince('12h ago')
        }}
      >
        12 hours ago
      </DropdownMenuItem>
    </div>
  )
})

const TemplateFilter = memo(function TemplateFilter() {
  const { templateFilters, setTemplateFilters } = useSandboxTableStore()

  const [localValue, setLocalValue] = React.useState('')

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmedValue = localValue.trim().toLowerCase()
    if (trimmedValue && !templateFilters.includes(trimmedValue)) {
      setTemplateFilters([...templateFilters, trimmedValue])
      setLocalValue('')
    }
  }, [localValue, templateFilters, setTemplateFilters])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className="w-80">
      <div className="flex items-center gap-2">
        <Input
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter template name or ID..."
          className="w-full"
        />
        <Button
          variant={'outline'}
          onClick={handleSubmit}
          disabled={!localValue.trim()}
        >
          <Plus className="size-3.5 min-w-3.5" />
        </Button>
      </div>
    </div>
  )
})

const ResourcesFilter = memo(function ResourcesFilter() {
  const { cpuCount, setCpuCount, memoryMB, setMemoryMB } =
    useSandboxTableStore()

  const [localValues, setLocalValues] = React.useState({
    cpu: cpuCount || 0,
    memory: memoryMB || 0,
  })

  const [debouncedValues] = useDebounceValue(localValues, 300)

  React.useEffect(() => {
    setCpuCount(debouncedValues.cpu || undefined)
    setMemoryMB(debouncedValues.memory || undefined)
  }, [debouncedValues, setCpuCount, setMemoryMB])

  const handleCpuChange = useCallback((value: number) => {
    setLocalValues((prev) => ({ ...prev, cpu: value }))
  }, [])

  const handleMemoryChange = useCallback((value: number) => {
    setLocalValues((prev) => ({ ...prev, memory: value }))
  }, [])

  const handleClearCpu = useCallback(() => {
    setLocalValues((prev) => ({ ...prev, cpu: 0 }))
  }, [])

  const handleClearMemory = useCallback(() => {
    setLocalValues((prev) => ({ ...prev, memory: 0 }))
  }, [])

  const formatMemoryDisplay = (memoryValue: number) => {
    if (memoryValue === 0) return 'Unfiltered'
    return formatMemory(memoryValue)
  }

  return (
    <div className="w-80 p-4">
      <div className="grid gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>CPU Cores</Label>
            <span className="text-accent-main-highlight text-xs">
              {localValues.cpu === 0
                ? 'Unfiltered'
                : formatCPUCores(localValues.cpu)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NumberInput
              value={localValues.cpu}
              onChange={handleCpuChange}
              min={0}
              max={8}
              step={1}
              className="w-full"
            />
            {localValues.cpu > 0 && (
              <Button
                variant="error"
                size="sm"
                onClick={handleClearCpu}
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
              {formatMemoryDisplay(localValues.memory)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NumberInput
              value={localValues.memory}
              onChange={handleMemoryChange}
              min={0}
              max={8192}
              step={512}
              className="w-full"
            />
            {localValues.memory > 0 && (
              <Button
                variant="error"
                size="sm"
                onClick={handleClearMemory}
                className="h-9 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

// Main component
export interface SandboxesTableFiltersProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const SandboxesTableFilters = memo(function SandboxesTableFilters({
  className,
  ...props
}: SandboxesTableFiltersProps) {
  const {
    startedAtFilter,
    templateFilters,
    cpuCount,
    memoryMB,
    setStartedAtFilter,
    setTemplateFilters,
    setCpuCount,
    setMemoryMB,
  } = useSandboxTableStore()

  const handleTemplateFilterClick = useCallback(
    (filter: string) => {
      setTemplateFilters(templateFilters.filter((t) => t !== filter))
    },
    [templateFilters, setTemplateFilters]
  )

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      {...props}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="md" className="normal-case gap-2">
            <ListFilter className="text-fg-tertiary size-4" /> Filter{' '}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Filters</DropdownMenuLabel>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Started</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <RunningSinceFilter />
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Template</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <TemplateFilter />
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Resources</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <ResourcesFilter />
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {startedAtFilter && (
        <TableFilterButton
          label="Started"
          value={startedAtFilter}
          onClick={() => setStartedAtFilter(undefined)}
        />
      )}
      {templateFilters.length > 0 &&
        templateFilters.map((filter) => (
          <TableFilterButton
            key={filter}
            label="Template"
            value={filter}
            onClick={() => handleTemplateFilterClick(filter)}
          />
        ))}
      {cpuCount !== undefined && (
        <TableFilterButton
          label="CPU"
          value={cpuCount.toString()}
          onClick={() => setCpuCount(undefined)}
        />
      )}
      {memoryMB !== undefined && (
        <TableFilterButton
          label="Memory"
          value={memoryMB.toString()}
          onClick={() => setMemoryMB(undefined)}
        />
      )}
    </div>
  )
})

SandboxesTableFilters.displayName = 'SandboxesTableFilters'

export default SandboxesTableFilters
