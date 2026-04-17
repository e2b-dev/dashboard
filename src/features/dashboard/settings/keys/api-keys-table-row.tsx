'use client'

import { usePostHog } from 'posthog-js/react'
import { useState } from 'react'
import { CLI_GENERATED_KEY_NAME } from '@/configs/api'
import type { TeamAPIKey } from '@/core/modules/keys/models'
import { UserAvatar } from '@/features/dashboard/shared'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { defaultSuccessToast, useToast } from '@/lib/hooks/use-toast'
import { formatDate, formatUTCTimestamp } from '@/lib/utils/formatting'
import { E2BLogo } from '@/ui/brand'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { CheckIcon, CopyIcon, KeyIcon, TrashIcon } from '@/ui/primitives/icons'
import { TableCell, TableRow } from '@/ui/primitives/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/ui/primitives/tooltip'
import { getApiKeyIdBadgeLabel, getLastUsedLabel } from './api-keys-utils'
import { DeleteApiKeyDialog } from './delete-api-key-dialog'

interface ApiKeysTableRowProps {
  apiKey: TeamAPIKey
  teamSlug: string
}

interface ApiKeyNameCellProps {
  name: string | null
}

interface ApiKeyIdBadgeProps {
  id: string
}

interface ApiKeyLastUsedCellProps {
  lastUsedAt?: string | null
  lastUsedLabel: string
}

interface ApiKeyAddedCellProps {
  addedDate: string
  createdBy?: TeamAPIKey['createdBy'] | null
  isCliKey: boolean
  keyName: string | null
  onDelete: () => void
}

const ApiKeyNameCell = ({ name }: ApiKeyNameCellProps) => (
  <TableCell className="py-2 text-left">
    <div className="flex min-w-0 items-center gap-3">
      <div className="border-stroke flex size-8 shrink-0 items-center justify-center border">
        <KeyIcon aria-hidden className="text-fg-tertiary size-4" />
      </div>
      <span
        className="text-fg min-w-0 truncate text-sm font-medium"
        title={name ?? 'Untitled key'}
      >
        {name ?? 'Untitled key'}
      </span>
    </div>
  </TableCell>
)

const ApiKeyIdBadge = ({ id }: ApiKeyIdBadgeProps) => {
  const posthog = usePostHog()
  const { toast } = useToast()
  const [wasCopied, copy] = useClipboard()
  const displayId = getApiKeyIdBadgeLabel(id)

  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    await copy(id)
    posthog.capture('copied API key id')
    toast(defaultSuccessToast('ID copied to clipboard'))
  }

  return (
    <Badge
      className="bg-bg-highlight text-fg-tertiary h-[18px] gap-[3px] px-1 prose-label-numeric"
      size="sm"
    >
      <span>{displayId}</span>
      <Button
        type="button"
        variant="ghost"
        size="slate"
        className="text-fg-tertiary hover:text-fg h-3 w-3 shrink-0 active:translate-y-0"
        aria-label="Copy full API key ID"
        onClick={handleCopy}
      >
        {wasCopied ? (
          <CheckIcon className="size-3" />
        ) : (
          <CopyIcon className="size-3" />
        )}
      </Button>
    </Badge>
  )
}

const ApiKeyLastUsedCell = ({
  lastUsedAt,
  lastUsedLabel,
}: ApiKeyLastUsedCellProps) => (
  <TableCell className="py-2 text-left text-sm text-fg-tertiary">
    {lastUsedAt ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default">
            {lastUsedLabel}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="font-mono text-xs">
          {formatUTCTimestamp(new Date(lastUsedAt))}
        </TooltipContent>
      </Tooltip>
    ) : (
      lastUsedLabel
    )}
  </TableCell>
)

const ApiKeyAddedCell = ({
  addedDate,
  createdBy,
  isCliKey,
  keyName,
  onDelete,
}: ApiKeyAddedCellProps) => {
  const createdByEmail = createdBy?.email?.trim() || 'Unknown user'

  return (
    <TableCell className="pl-3 pr-0 py-2 text-left text-sm text-fg-tertiary">
      <div className="flex items-center gap-6 justify-between">
        <span className="block w-[92px] shrink-0 whitespace-nowrap">
          {addedDate}
        </span>
        <div className="flex items-center gap-6">
          {isCliKey ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-fg-tertiary flex size-5 shrink-0 items-center justify-center">
                  <E2BLogo className="size-5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Added through E2B CLI</TooltipContent>
            </Tooltip>
          ) : createdBy ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default shrink-0">
                  <UserAvatar email={createdByEmail} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">{createdByEmail}</TooltipContent>
            </Tooltip>
          ) : (
            <span className="size-5 shrink-0" aria-hidden />
          )}
          <Button
            type="button"
            variant="ghost"
            size="slate"
            className="text-fg-tertiary hover:text-fg shrink-0 active:translate-y-0"
            aria-label={`Delete ${keyName ?? 'API key'}`}
            onClick={onDelete}
          >
            <TrashIcon className="size-4" />
          </Button>
        </div>
      </div>
    </TableCell>
  )
}

export const ApiKeysTableRow = ({ apiKey, teamSlug }: ApiKeysTableRowProps) => {
  const [deleteOpen, setDeleteOpen] = useState(false)

  const addedDate = apiKey.createdAt
    ? (formatDate(new Date(apiKey.createdAt), 'MMM d, yyyy') ?? '—')
    : '—'

  const lastUsedAt = apiKey.lastUsed
  const lastUsedLabel = getLastUsedLabel(apiKey)
  const isCliKey = apiKey.name === CLI_GENERATED_KEY_NAME

  return (
    <>
      <DeleteApiKeyDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        teamSlug={teamSlug}
        apiKey={apiKey}
      />
      <TableRow className="h-12">
        <ApiKeyNameCell name={apiKey.name} />
        <TableCell className="py-2 text-left">
          <ApiKeyIdBadge id={apiKey.id} />
        </TableCell>
        <ApiKeyLastUsedCell
          lastUsedAt={lastUsedAt}
          lastUsedLabel={lastUsedLabel}
        />
        <ApiKeyAddedCell
          addedDate={addedDate}
          createdBy={apiKey.createdBy}
          isCliKey={isCliKey}
          keyName={apiKey.name}
          onDelete={() => setDeleteOpen(true)}
        />
      </TableRow>
    </>
  )
}
