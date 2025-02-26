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
} from '@/ui/primitives/dropdown-menu'
import { DropdownMenuTrigger } from '@/ui/primitives/dropdown-menu'
import { cn } from '@/lib/utils'
import * as React from 'react'
import { Slider } from '@/ui/primitives/slider'
import { Label } from '@/ui/primitives/label'
import { Separator } from '@/ui/primitives/separator'
import { useDebounceValue } from 'usehooks-ts'
import { useSandboxTableStore } from '@/features/dashboard/sandboxes/stores/table-store'
import { Button } from '@/ui/primitives/button'
import { ListFilter } from 'lucide-react'
import { TableFilterButton } from '@/ui/table-filter-button'
import { Template } from '@/types/api'
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/primitives/command'
import { memo, useCallback } from 'react'
import { NumberInput } from '@/ui/number-input'

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
        className={cn(startedAtFilter === '1h ago' && 'text-accent')}
        onClick={(e) => {
          e.preventDefault()
          handleRunningSince('1h ago')
        }}
      >
        1 hour ago
      </DropdownMenuItem>
      <DropdownMenuItem
        className={cn(startedAtFilter === '6h ago' && 'text-accent')}
        onClick={(e) => {
          e.preventDefault()
          handleRunningSince('6h ago')
        }}
      >
        6 hours ago
      </DropdownMenuItem>
      <DropdownMenuItem
        className={cn(startedAtFilter === '12h ago' && 'text-accent')}
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

interface TemplateFilterProps {
  templates: Template[]
}

const TemplateFilter = memo(function TemplateFilter({
  templates,
}: TemplateFilterProps) {
  const { templateIds, setTemplateIds } = useSandboxTableStore()

  const handleSelect = useCallback(
    (templateId: string) => {
      if (templateIds.includes(templateId)) {
        setTemplateIds(templateIds.filter((id) => id !== templateId))
      } else {
        setTemplateIds([...templateIds, templateId])
      }
    },
    [templateIds, setTemplateIds]
  )

  return (
    <Command>
      <CommandInput placeholder="Search templates..." />
      <CommandList>
        {templates?.map((template) => (
          <CommandItem
            key={template.templateID}
            onSelect={() => handleSelect(template.templateID)}
            className={cn(
              templateIds.includes(template.templateID) && 'text-accent'
            )}
          >
            {template.templateID}
          </CommandItem>
        ))}
      </CommandList>
    </Command>
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
    return memoryValue < 1024 ? `${memoryValue} MB` : `${memoryValue / 1024} GB`
  }

  return (
    <div className="w-80 p-4">
      <div className="grid gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>CPU Cores</Label>
            <span className="text-accent text-xs">
              {localValues.cpu === 0
                ? 'Unfiltered'
                : `${localValues.cpu} core${localValues.cpu === 1 ? '' : 's'}`}
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
            <span className="text-accent text-xs">
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
  extends React.HTMLAttributes<HTMLDivElement> {
  templates: Template[]
}

const SandboxesTableFilters = memo(function SandboxesTableFilters({
  className,
  templates,
  ...props
}: SandboxesTableFiltersProps) {
  const {
    globalFilter,
    startedAtFilter,
    templateIds,
    cpuCount,
    memoryMB,
    setGlobalFilter,
    setStartedAtFilter,
    setTemplateIds,
    setCpuCount,
    setMemoryMB,
  } = useSandboxTableStore()

  const handleTemplateFilterClick = useCallback(
    (id: string) => {
      setTemplateIds(templateIds.filter((t) => t !== id))
    },
    [templateIds, setTemplateIds]
  )

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      {...props}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs normal-case">
            <ListFilter className="text-fg-500 size-4" /> Filters{' '}
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
                  <TemplateFilter templates={templates} />
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

      {globalFilter && (
        <TableFilterButton
          label="Search"
          value={globalFilter}
          onClick={() => setGlobalFilter('')}
        />
      )}
      {startedAtFilter && (
        <TableFilterButton
          label="Started"
          value={startedAtFilter}
          onClick={() => setStartedAtFilter(undefined)}
        />
      )}
      {templateIds.length > 0 &&
        templateIds.map((id) => (
          <TableFilterButton
            key={id}
            label="Template"
            value={id}
            onClick={() => handleTemplateFilterClick(id)}
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
