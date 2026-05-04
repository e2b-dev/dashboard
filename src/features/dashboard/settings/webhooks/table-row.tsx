'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/ui/primitives/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { IconButton } from '@/ui/primitives/icon-button'
import {
  EditIcon,
  IndicatorDotsIcon,
  PrivateIcon,
  TrashIcon,
  WebhookIcon,
} from '@/ui/primitives/icons'
import { TableCell, TableRow } from '@/ui/primitives/table'
import { useDashboard } from '../../context'
import { TeamAvatar } from '../../sidebar/team-avatar'
import WebhookAddEditDialog from './add-edit-dialog'
import { WEBHOOK_EVENT_LABELS, WEBHOOK_EVENTS } from './constants'
import WebhookDeleteDialog from './delete-dialog'
import WebhookEditSecretDialog from './edit-secret-dialog'
import type { Webhook } from './types'

type WebhookRowProps = {
  webhook: Webhook
  className?: string
}

type WebhookRowActionsProps = {
  webhook: Webhook
}

const rowCellClassName = 'h-11 p-0 align-middle'
const actionIconClassName = 'size-4 text-fg-tertiary'

const getWebhookEventLabel = (event: string): string => {
  const matchedEvent = WEBHOOK_EVENTS.find(
    (webhookEvent) => webhookEvent === event
  )
  if (!matchedEvent) return event
  return WEBHOOK_EVENT_LABELS[matchedEvent]
}

const WebhookRowActions = ({ webhook }: WebhookRowActionsProps) => {
  const [dropDownOpen, setDropDownOpen] = useState(false)

  return (
    <DropdownMenu open={dropDownOpen} onOpenChange={setDropDownOpen}>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label={`Open actions for ${webhook.name}`}>
          <IndicatorDotsIcon />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <WebhookAddEditDialog mode="edit" webhook={webhook}>
            <DropdownMenuItem inset onSelect={(e) => e.preventDefault()}>
              <EditIcon className={actionIconClassName} /> Edit
            </DropdownMenuItem>
          </WebhookAddEditDialog>
          <WebhookEditSecretDialog webhook={webhook}>
            <DropdownMenuItem inset onSelect={(e) => e.preventDefault()}>
              <PrivateIcon className={actionIconClassName} /> Rotate Secret
            </DropdownMenuItem>
          </WebhookEditSecretDialog>
          <WebhookDeleteDialog webhook={webhook}>
            <DropdownMenuItem
              inset
              variant="error"
              onSelect={(e) => e.preventDefault()}
            >
              <TrashIcon className="size-4" />
              Delete
            </DropdownMenuItem>
          </WebhookDeleteDialog>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const WebhookTableRow = ({ webhook, className }: WebhookRowProps) => {
  const { team } = useDashboard()

  const createdAt = webhook.createdAt
    ? new Date(webhook.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '-'

  return (
    <TableRow className={cn('h-11 bg-bg hover:bg-transparent', className)}>
      <TableCell className={cn(rowCellClassName, 'max-w-0 pr-12')}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="border-stroke flex size-8 shrink-0 items-center justify-center border">
            <WebhookIcon className="size-4 text-fg-secondary" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pb-0.5">
            <p className="truncate text-left text-fg prose-body">
              {webhook.name}
            </p>
            <p className="truncate font-mono text-[12px] leading-[17px] text-fg-tertiary uppercase">
              {webhook.url}
            </p>
          </div>
        </div>
      </TableCell>

      <TableCell
        className={cn(rowCellClassName, 'w-[216px] max-w-[216px] pr-12')}
      >
        <div className="flex w-[216px] items-center gap-1 overflow-hidden">
          {webhook.events.map((event) => (
            <Badge key={event} variant="default" className="px-1">
              {getWebhookEventLabel(event)}
            </Badge>
          ))}
        </div>
      </TableCell>

      <TableCell className={cn(rowCellClassName, 'w-[136px]')}>
        <div className="flex items-center justify-end gap-6">
          <p className="w-[92px] text-left text-fg-tertiary prose-body">
            {createdAt}
          </p>
          <TeamAvatar
            team={team}
            classNames={{
              root: 'size-5 shrink-0 border border-white/10',
              image: 'size-full',
            }}
          />
        </div>
      </TableCell>

      <TableCell className={cn(rowCellClassName, 'w-10 pl-6 text-right')}>
        <WebhookRowActions webhook={webhook} />
      </TableCell>
    </TableRow>
  )
}
