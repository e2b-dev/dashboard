'use client'

import { usePostHog } from 'posthog-js/react'
import { useState } from 'react'
import { IdBadge, UserAvatar } from '@/features/dashboard/shared'
import { defaultSuccessToast, useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/formatting'
import { Badge } from '@/ui/primitives/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { IconButton } from '@/ui/primitives/icon-button'
import { EditIcon, IndicatorDotsIcon, TrashIcon } from '@/ui/primitives/icons'
import { TableCell, TableRow } from '@/ui/primitives/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/ui/primitives/tooltip'
import { DeleteSecretDialog } from './delete-secret-dialog'
import { EditSecretDialog } from './edit-secret-dialog'
import type { Secret } from './types'

const tableCellClassName = 'py-3 text-left [tr:first-child>&]:pt-1.5'
const actionIconClassName = 'size-4 text-fg-tertiary'

interface SecretsTableRowProps {
  secret: Secret
}

export const SecretsTableRow = ({ secret }: SecretsTableRowProps) => {
  const posthog = usePostHog()
  const { toast } = useToast()

  const addedDate = formatDate(new Date(secret.createdAt), 'MMM d, yyyy') ?? '—'
  const createdByEmail = secret.createdBy?.email?.trim() || 'Unknown user'

  const handleIdCopied = () => {
    posthog.capture('copied secret id')
    toast(defaultSuccessToast('ID copied to clipboard'))
  }

  return (
    <TableRow>
      <TableCell className={tableCellClassName}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="border-stroke flex size-8 shrink-0 items-center justify-center border ">
            <span className="font-medium text-fg-tertiary leading-none mt-0.5">
              ***
            </span>
          </div>
          <span
            className="text-fg min-w-0 truncate text-sm font-medium"
            title={secret.label}
          >
            {secret.label}
          </span>
        </div>
      </TableCell>

      <TableCell className={tableCellClassName}>
        <IdBadge
          id={secret.id}
          copyAriaLabel="Copy secret ID"
          onCopied={handleIdCopied}
        />
      </TableCell>

      <TableCell className={cn(tableCellClassName, 'text-sm text-fg-tertiary')}>
        <AllowedForCell secret={secret} />
      </TableCell>

      <TableCell className={cn(tableCellClassName, 'text-sm text-fg-tertiary')}>
        <div className="flex items-center gap-3">
          <span className="block w-[92px] shrink-0 whitespace-nowrap">
            {addedDate}
          </span>
          <div className="flex items-center gap-3">
            {secret.createdBy ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="shrink-0 cursor-default">
                    <UserAvatar
                      label={createdByEmail}
                      url={secret.createdBy.avatarUrl}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">{createdByEmail}</TooltipContent>
              </Tooltip>
            ) : (
              <span aria-hidden className="size-5 shrink-0" />
            )}
            <SecretRowActions secret={secret} />
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

function SecretRowActions({ secret }: { secret: Secret }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton aria-label={`Open actions for ${secret.label}`}>
            <IndicatorDotsIcon className="-rotate-90" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem inset onSelect={() => setEditOpen(true)}>
              <EditIcon className={actionIconClassName} /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem inset onSelect={() => setDeleteOpen(true)}>
              <TrashIcon className={actionIconClassName} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditSecretDialog
        secret={secret}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteSecretDialog
        secret={secret}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}

function AllowedForCell({ secret }: { secret: Secret }) {
  if (secret.allowList.mode === 'all') {
    return <Badge size="md">All hosts</Badge>
  }

  const { hosts } = secret.allowList
  const [first, ...rest] = hosts
  const label = rest.length === 0 ? first : `${first} +${rest.length}`

  const badge = <Badge size="md">{label}</Badge>

  if (rest.length === 0) return badge

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="px-4 py-3 text-xs uppercase"
      >
        <ul className="flex flex-col gap-1">
          {hosts.map((host) => (
            <li key={host}>{host}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}
