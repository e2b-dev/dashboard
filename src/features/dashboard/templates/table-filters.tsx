'use client'

import { cn } from '@/lib/utils'
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
import { Label } from '@/ui/primitives/label'
import { Separator } from '@/ui/primitives/separator'
import { TableFilterButton } from '@/ui/table-filter-button'
import { ListFilter } from 'lucide-react'
import * as React from 'react'
import { useDebounceValue } from 'usehooks-ts'
import { useTemplateTableStore } from './stores/table-store'

// Components
const ResourcesFilter = () => {
  const { cpuCount, setCpuCount, memoryMB, setMemoryMB } =
    useTemplateTableStore()

  const [localValues, setLocalValues] = React.useState({
    cpu: cpuCount || 0,
    memory: memoryMB || 0,
  })

  const [debouncedValues] = useDebounceValue(localValues, 300)

  React.useEffect(() => {
    setCpuCount(debouncedValues.cpu || undefined)
    setMemoryMB(debouncedValues.memory || undefined)
  }, [debouncedValues, setCpuCount, setMemoryMB])

  const handleCpuChange = React.useCallback((value: number) => {
    setLocalValues((prev) => ({ ...prev, cpu: value }))
  }, [])

  const handleMemoryChange = React.useCallback((value: number) => {
    setLocalValues((prev) => ({ ...prev, memory: value }))
  }, [])

  const handleClearCpu = React.useCallback(() => {
    setLocalValues((prev) => ({ ...prev, cpu: 0 }))
  }, [])

  const handleClearMemory = React.useCallback(() => {
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
}

// Main component

export interface TemplatesTableFiltersProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const TemplatesTableFilters = React.forwardRef<
  HTMLDivElement,
  TemplatesTableFiltersProps
>(({ className, ...props }, ref) => {
  const {
    globalFilter,
    cpuCount,
    memoryMB,
    isPublic,
    createdAfter,
    createdBefore,
    setGlobalFilter,
    setCpuCount,
    setMemoryMB,
    setIsPublic,
    setCreatedAfter,
    setCreatedBefore,
  } = useTemplateTableStore()

  return (
    <div
      ref={ref}
      className={cn('flex items-center gap-2', className)}
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
              <DropdownMenuSubTrigger>Resources</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <ResourcesFilter />
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Visibility</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    className={isPublic === true ? 'text-accent' : undefined}
                    onClick={(e) => {
                      e.preventDefault()
                      setIsPublic(isPublic === true ? undefined : true)
                    }}
                  >
                    Public
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={isPublic === false ? 'text-accent' : undefined}
                    onClick={(e) => {
                      e.preventDefault()
                      setIsPublic(isPublic === false ? undefined : false)
                    }}
                  >
                    Private
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Filter Pills */}
      {globalFilter && (
        <TableFilterButton
          label="Search"
          value={globalFilter}
          onClick={() => setGlobalFilter('')}
        />
      )}
      {cpuCount && (
        <TableFilterButton
          label="CPU"
          value={`${cpuCount} cores`}
          onClick={() => setCpuCount(undefined)}
        />
      )}
      {memoryMB && (
        <TableFilterButton
          label="Memory"
          value={`${memoryMB} MB`}
          onClick={() => setMemoryMB(undefined)}
        />
      )}
      {isPublic !== undefined && (
        <TableFilterButton
          label="Visibility"
          value={isPublic ? 'Public' : 'Private'}
          onClick={() => setIsPublic(undefined)}
        />
      )}
      {(createdAfter || createdBefore) && (
        <TableFilterButton
          label="Date Range"
          value="Active"
          onClick={() => {
            setCreatedAfter(undefined)
            setCreatedBefore(undefined)
          }}
        />
      )}
    </div>
  )
})

TemplatesTableFilters.displayName = 'TemplatesTableFilters'

export default TemplatesTableFilters
