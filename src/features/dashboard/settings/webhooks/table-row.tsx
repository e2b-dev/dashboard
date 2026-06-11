'use client'

import Link from 'next/link'
import { Fragment, useState } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { SandboxLifecycleEventTypeSchema } from '@/core/modules/sandboxes/lifecycle-event-types'
import { formatZonedDate, useTimezone } from '@/features/dashboard/timezone'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { defaultSuccessToast, toast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { IconButton } from '@/ui/primitives/icon-button'
import {
  CheckmarkIcon,
  CopyIcon,
  EditIcon,
  IndicatorDotsIcon,
  PrivateIcon,
  RemoveIcon,
  WebhookIcon,
} from '@/ui/primitives/icons'
import { TableCell, TableRow } from '@/ui/primitives/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/ui/primitives/tooltip'
import { RowHoverFrame } from '@/ui/row-hover-frame'
import { useDashboard } from '../../context'
import { UserAvatar } from '../../shared'
import { WEBHOOK_EVENT_LABELS } from './constants'
import { DeleteWebhookDialog } from './delete-webhook-dialog'
import type { Webhook } from './types'
import { UpdateWebhookSecretDialog } from './update-webhook-secret-dialog'
import { UpsertWebhookDialog } from './upsert-webhook-dialog'

type WebhookRowProps = {
  webhook: Webhook
}

type WebhookRowActionsProps = {
  webhook: Webhook
}

type WebhookNameAndUrlProps = {
  name: string
  url: string
}

const WebhookNameAndUrl = ({ name, url }: WebhookNameAndUrlProps) => {
  const [wasCopied, copy] = useClipboard(1500)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await copy(url)
    toast(defaultSuccessToast('Webhook URL copied'))
  }

  return (
    <div className={cn(rowContentClassName, 'min-w-0 gap-3')}>
      <div
        aria-hidden="true"
        className="border-stroke flex size-8 shrink-0 items-center justify-center border"
      >
        <WebhookIcon className="size-4 text-fg-secondary" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pb-0.5">
        <p
          className="w-fit max-w-full truncate text-left text-fg prose-body"
          title={name}
        >
          {name}
        </p>
        <div className="flex h-[17px] min-w-0 items-center gap-2">
          <span className="truncate font-mono uppercase text-fg-tertiary prose-label-numeric">
            {url}
          </span>
          <Button
            variant="quaternary"
            size="none"
            onClick={handleCopy}
            aria-label={`Copy webhook URL ${url}`}
            className={cn(
              'relative z-10 h-full shrink-0 hover:[&_svg]:text-icon',
              'hidden group-hover/row:inline-flex group-has-[:focus-visible]/row:inline-flex'
            )}
          >
            {wasCopied ? <CheckmarkIcon /> : <CopyIcon />}
            <span className="grid text-left">
              <span className="col-start-1 row-start-1">
                {wasCopied ? 'Copied' : 'Copy'}
              </span>
              <span
                aria-hidden="true"
                className="invisible col-start-1 row-start-1"
              >
                Copied
              </span>
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}

const rowCellClassName = 'p-0 py-1.5 align-middle'
const rowContentClassName = 'flex items-center'
const actionIconClassName = 'size-4 text-fg-tertiary'

const getWebhookEventLabel = (event: string): string => {
  const matchedEvent = SandboxLifecycleEventTypeSchema.options.find(
    (webhookEvent) => webhookEvent === event
  )
  if (!matchedEvent) return event
  return WEBHOOK_EVENT_LABELS[matchedEvent]
}

type WebhookEventBadgesProps = {
  events: readonly string[]
}

const WebhookEventBadges = ({ events }: WebhookEventBadgesProps) => {
  const isAllEvents =
    events.length === SandboxLifecycleEventTypeSchema.options.length

  if (isAllEvents) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="relative z-10 cursor-pointer">
            ALL ({events.length})
          </Badge>
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

const WebhookRowActions = ({ webhook }: WebhookRowActionsProps) => {
  const [dropDownOpen, setDropDownOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editSecretOpen, setEditSecretOpen] = useState(false)

  const handleDialogSelect = (
    event: Event,
    setDialogOpen: (open: boolean) => void
  ) => {
    event.preventDefault()
    setDropDownOpen(false)
    setDialogOpen(true)
  }

  return (
    <>
      <DropdownMenu open={dropDownOpen} onOpenChange={setDropDownOpen}>
        <DropdownMenuTrigger asChild>
          <IconButton
            aria-label={`Open actions for ${webhook.name}`}
            className="relative z-10 size-5"
            onClick={(e) => e.stopPropagation()}
          >
            <IndicatorDotsIcon className="-rotate-90" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem
              inset
              onSelect={(event) => handleDialogSelect(event, setEditOpen)}
            >
              <EditIcon className={actionIconClassName} /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              inset
              onSelect={(event) => handleDialogSelect(event, setDeleteOpen)}
            >
              <RemoveIcon className={actionIconClassName} />
              Delete
            </DropdownMenuItem>
            <DropdownMenuItem
              inset
              onSelect={(event) => handleDialogSelect(event, setEditSecretOpen)}
            >
              <PrivateIcon className={actionIconClassName} /> Edit secret
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <UpsertWebhookDialog
        mode="update"
        webhook={webhook}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteWebhookDialog
        webhook={webhook}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
      <UpdateWebhookSecretDialog
        webhook={webhook}
        open={editSecretOpen}
        onOpenChange={setEditSecretOpen}
      />
    </>
  )
}

export const WebhookTableRow = ({ webhook }: WebhookRowProps) => {
  const { team } = useDashboard()
  const { timezone } = useTimezone()

  const createdAt = webhook.createdAt
    ? (formatZonedDate(webhook.createdAt, timezone) ?? '-')
    : '-'

  const webhookHref = PROTECTED_URLS.WEBHOOK(team.slug, webhook.id)

  return (
    <TableRow
      className={cn(
        'group/row relative z-0 cursor-pointer border-b-0 transition-none',
        'border-stroke/80 hover:z-20 focus-within:z-10',
        'has-[button[aria-haspopup=menu][data-state=open]]:z-10'
      )}
    >
      <TableCell className={cn(rowCellClassName, 'max-w-0')}>
        <Link
          href={webhookHref}
          prefetch={false}
          aria-label={`Open webhook ${webhook.name}`}
          className="absolute -inset-x-3 -inset-y-px z-1"
        />
        <RowHoverFrame
          className={cn(
            '-inset-x-3 -z-10 group-hover/row:bg-bg-1',
            'group-has-[button[aria-haspopup=menu][data-state=open]]/row:border-stroke',
            'group-has-[button[aria-haspopup=menu][data-state=open]]/row:[--corner-mark-color:var(--color-fg-tertiary)]'
          )}
        />
        <WebhookNameAndUrl name={webhook.name} url={webhook.url} />
      </TableCell>

      <TableCell className={cn(rowCellClassName, 'w-[216px]')}>
        <div className="flex items-center gap-1">
          <WebhookEventBadges events={webhook.events} />
        </div>
      </TableCell>

      <TableCell className={cn(rowCellClassName, 'w-[184px]')}>
        <div className={cn(rowContentClassName, 'justify-end gap-6')}>
          <p className="w-[92px] whitespace-nowrap text-left text-fg-tertiary prose-body">
            {createdAt}
          </p>
          <UserAvatar label={team.name} />
        </div>
      </TableCell>

      <TableCell className={cn(rowCellClassName, 'w-10 pl-5 text-right')}>
        <WebhookRowActions webhook={webhook} />
      </TableCell>
    </TableRow>
  )
}
