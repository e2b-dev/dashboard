import {
  getSandboxLifecycleEventLabel,
  SANDBOX_LIFECYCLE_EVENT_TYPE_VALUES,
  type SandboxLifecycleEventType,
  sandboxLifecycleEventTypeSchema,
} from '@/core/modules/sandboxes/lifecycle-event-types'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { SandboxEventTypeBadge } from './event-type-badge'

const ALL_EVENT_TYPES_VALUE = 'all'

interface EventTypeFilterProps {
  type: SandboxLifecycleEventType | null
  onTypeChange: (type: SandboxLifecycleEventType | null) => void
  className?: string
}

export const EventTypeFilter = ({
  type,
  onTypeChange,
  className,
}: EventTypeFilterProps) => {
  const selectedTypeLabel = type ? getSandboxLifecycleEventLabel(type) : 'All'

  return (
    <div className={cn('flex min-h-0', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" className="font-sans w-min normal-case">
            Events · {selectedTypeLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={type ?? ALL_EVENT_TYPES_VALUE}
            onValueChange={(value) => {
              if (value === ALL_EVENT_TYPES_VALUE) {
                onTypeChange(null)
                return
              }

              const parsedType =
                sandboxLifecycleEventTypeSchema.safeParse(value)
              if (!parsedType.success) return
              onTypeChange(parsedType.data)
            }}
          >
            <DropdownMenuRadioItem value={ALL_EVENT_TYPES_VALUE}>
              All events
            </DropdownMenuRadioItem>
            {SANDBOX_LIFECYCLE_EVENT_TYPE_VALUES.map((type) => (
              <DropdownMenuRadioItem key={type} value={type}>
                <SandboxEventTypeBadge type={type} />
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
