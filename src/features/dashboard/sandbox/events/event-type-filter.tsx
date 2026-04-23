import {
  type SandboxLifecycleEventType,
  SandboxLifecycleEventTypeSchema,
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
import { SANDBOX_EVENT_TYPE_MAP } from './event-type-map'

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
  return (
    <div className={cn('flex min-h-0', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" className="font-sans w-min normal-case">
            Events · {type ? SANDBOX_EVENT_TYPE_MAP[type].label : 'All'}
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

              onTypeChange(SandboxLifecycleEventTypeSchema.parse(value))
            }}
          >
            <DropdownMenuRadioItem value={ALL_EVENT_TYPES_VALUE}>
              All events
            </DropdownMenuRadioItem>
            {SandboxLifecycleEventTypeSchema.options.map((type) => (
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
