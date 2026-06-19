import { Fragment } from 'react'
import { SandboxLifecycleEventTypeSchema } from '@/core/modules/sandboxes/lifecycle-event-types'
import { Badge } from '@/ui/primitives/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/ui/primitives/tooltip'
import { WEBHOOK_EVENT_LABELS } from './constants'

type WebhookEventBadgesProps = {
  events: readonly string[]
}

const getWebhookEventLabel = (event: string): string => {
  const matchedEvent = SandboxLifecycleEventTypeSchema.options.find(
    (webhookEvent) => webhookEvent === event
  )
  if (!matchedEvent) return event
  return WEBHOOK_EVENT_LABELS[matchedEvent]
}

export const WebhookEventBadges = ({ events }: WebhookEventBadgesProps) => {
  const isAllEvents =
    events.length === SandboxLifecycleEventTypeSchema.options.length

  if (isAllEvents) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="cursor-pointer">ALL ({events.length})</Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex flex-wrap items-center gap-1 prose-label uppercase">
            {SandboxLifecycleEventTypeSchema.options.map((event, index) => (
              <Fragment key={event}>
                {index > 0 && (
                  <span aria-hidden="true" className="text-fg-tertiary">
                    ·
                  </span>
                )}
                <span className="text-fg">{WEBHOOK_EVENT_LABELS[event]}</span>
              </Fragment>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return events.map((event) => (
    <Badge key={event}>{getWebhookEventLabel(event)}</Badge>
  ))
}
