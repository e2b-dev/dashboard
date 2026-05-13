'use client'

import Link from 'next/link'
import { useState } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { defaultSuccessToast, toast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
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
  CheckIcon,
  CopyIcon,
  EditIcon,
  IndicatorDotsIcon,
  PrivateIcon,
  TrashIcon,
  WebhookIcon,
} from '@/ui/primitives/icons'
import { TableCell, TableRow } from '@/ui/primitives/table'
import { useDashboard } from '../../context'
import { UserAvatar } from '../../shared'
import { DeleteWebhookDialog } from './delete-webhook-dialog'
import { WebhookEventBadges } from './event-badges'
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
  href: string
  name: string
  url: string
}

type UrlIconState = 'copied' | 'hovered' | 'idle'

const urlIconMap: Record<UrlIconState, typeof WebhookIcon> = {
  copied: CheckIcon,
  hovered: CopyIcon,
  idle: WebhookIcon,
}

const WebhookNameAndUrl = ({ href, name, url }: WebhookNameAndUrlProps) => {
  const [wasCopied, copy] = useClipboard(1500)
  const [isUrlHovered, setIsUrlHovered] = useState(false)
  const iconState: UrlIconState = wasCopied
    ? 'copied'
    : isUrlHovered
      ? 'hovered'
      : 'idle'
  const UrlIcon = urlIconMap[iconState]

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
        <UrlIcon className="size-4 text-fg-secondary" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pb-0.5">
        <Button variant="quaternary" size="none" asChild>
          <Link
            href={href}
            className="w-fit max-w-full truncate text-left text-fg prose-body hover:underline"
          >
            {name}
          </Link>
        </Button>
        <Button
          variant="quaternary"
          size="none"
          onClick={handleCopy}
          onMouseEnter={() => setIsUrlHovered(true)}
          onMouseLeave={() => setIsUrlHovered(false)}
          aria-label={`Copy webhook URL ${url}`}
          className="w-full min-w-0 justify-start font-mono uppercase prose-label-numeric"
        >
          <span className="truncate">{url}</span>
        </Button>
      </div>
    </div>
  )
}

const rowCellClassName = 'p-0 py-1.5 align-middle [tr:first-child>&]:pt-0'
const rowContentClassName = 'flex items-center'
const actionIconClassName = 'size-4 text-fg-tertiary'

const WebhookRowActions = ({ webhook }: WebhookRowActionsProps) => {
  const [dropDownOpen, setDropDownOpen] = useState(false)

  return (
    <DropdownMenu open={dropDownOpen} onOpenChange={setDropDownOpen}>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label={`Open actions for ${webhook.name}`}>
          <IndicatorDotsIcon className="-rotate-90" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <UpsertWebhookDialog mode="update" webhook={webhook}>
            <DropdownMenuItem inset onSelect={(e) => e.preventDefault()}>
              <EditIcon className={actionIconClassName} /> Edit
            </DropdownMenuItem>
          </UpsertWebhookDialog>
          <DeleteWebhookDialog webhook={webhook}>
            <DropdownMenuItem inset onSelect={(e) => e.preventDefault()}>
              <TrashIcon className={actionIconClassName} />
              Delete
            </DropdownMenuItem>
          </DeleteWebhookDialog>
          <UpdateWebhookSecretDialog webhook={webhook}>
            <DropdownMenuItem inset onSelect={(e) => e.preventDefault()}>
              <PrivateIcon className={actionIconClassName} /> Edit secret
            </DropdownMenuItem>
          </UpdateWebhookSecretDialog>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const WebhookTableRow = ({ webhook }: WebhookRowProps) => {
  const { team } = useDashboard()

  const createdAt = webhook.createdAt
    ? new Date(webhook.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '-'

  const webhookHref = PROTECTED_URLS.WEBHOOK(team.slug, webhook.id)

  return (
    <TableRow>
      <TableCell className={cn(rowCellClassName, 'max-w-0')}>
        <WebhookNameAndUrl
          href={webhookHref}
          name={webhook.name}
          url={webhook.url}
        />
      </TableCell>

      <TableCell className={cn(rowCellClassName, 'w-[216px]')}>
        <div className="flex items-center gap-1">
          <WebhookEventBadges events={webhook.events} />
        </div>
      </TableCell>

      <TableCell className={cn(rowCellClassName, 'w-[136px]')}>
        <div className={cn(rowContentClassName, 'justify-end gap-6')}>
          <p className="w-[92px] text-left text-fg-tertiary prose-body">
            {createdAt}
          </p>
          <UserAvatar label={team.name} />
        </div>
      </TableCell>

      <TableCell className={cn(rowCellClassName, 'w-10 pl-6 text-right')}>
        <WebhookRowActions webhook={webhook} />
      </TableCell>
    </TableRow>
  )
}
