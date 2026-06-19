'use client'

import {
  type SandboxLifecycleEventType,
  SandboxLifecycleEventTypeSchema,
} from '@/core/modules/sandboxes/lifecycle-event-types'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { EventTypeBadge } from './event-type-badge'
import { SANDBOX_EVENT_TYPE_MAP } from './event-type-map'

const getTriggerLabel = (selected: SandboxLifecycleEventType[]) => {
  if (selected.length === SandboxLifecycleEventTypeSchema.options.length)
    return 'All'
  if (selected.length === 0) return 'None'
  const [first] = selected
  if (selected.length === 1 && first) return SANDBOX_EVENT_TYPE_MAP[first].label
  return `${selected.length}/${SandboxLifecycleEventTypeSchema.options.length}`
}

interface EventTypeFilterProps {
  types: SandboxLifecycleEventType[]
  onTypesChange: (types: SandboxLifecycleEventType[]) => void
}

export const EventTypeFilter = ({
  types,
  onTypesChange,
}: EventTypeFilterProps) => {
  const isAllSelected =
    types.length === SandboxLifecycleEventTypeSchema.options.length

  const toggleType = (type: SandboxLifecycleEventType) => {
    const next = types.includes(type)
      ? types.filter((t) => t !== type)
      : [...types, type]
    onTypesChange(next)
  }

  const toggleAll = (checked: boolean) => {
    onTypesChange(checked ? [...SandboxLifecycleEventTypeSchema.options] : [])
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="font-sans w-min normal-case">
          Events · {getTriggerLabel(types)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuCheckboxItem
          checked={isAllSelected}
          onCheckedChange={toggleAll}
          onSelect={(e) => e.preventDefault()}
        >
          All events
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {SandboxLifecycleEventTypeSchema.options.map((type) => (
          <DropdownMenuCheckboxItem
            key={type}
            checked={types.includes(type)}
            onCheckedChange={() => toggleType(type)}
            onSelect={(e) => e.preventDefault()}
          >
            <EventTypeBadge type={type} />
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
