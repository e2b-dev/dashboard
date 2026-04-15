'use client'

import { usePostHog } from 'posthog-js/react'
import { useState } from 'react'
import { CLI_GENERATED_KEY_NAME } from '@/configs/api'
import type { TeamAPIKey } from '@/core/modules/keys/models'
import { UserAvatar } from '@/features/dashboard/shared'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { formatDate } from '@/lib/utils/formatting'
import { E2BLogo } from '@/ui/brand'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { CheckIcon, CopyIcon, KeyIcon, RemoveIcon } from '@/ui/primitives/icons'
import { TableCell, TableRow } from '@/ui/primitives/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/ui/primitives/tooltip'
import { getLastUsedLabel, toIsoUtcString } from './api-keys-utils'
import { DeleteApiKeyDialog } from './delete-api-key-dialog'

interface ApiKeysTableRowProps {
  apiKey: TeamAPIKey
  teamSlug: string
}

interface ApiKeyNameCellProps {
  name: string | null
}

interface ApiKeyIdBadgeProps {
  value: string
  onCopy: () => void
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
  <TableCell className="py-[6px] text-left">
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

const ApiKeyIdBadge = ({ value, onCopy }: ApiKeyIdBadgeProps) => {
  const [wasCopied, copy] = useClipboard()

  const handleCopy = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    void copy(value)
    onCopy()
  }

  return (
    <Badge
      className="bg-bg-highlight text-fg-tertiary h-[18px] gap-[3px] px-1 prose-label-numeric"
      size="sm"
    >
      <span>{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="slate"
        className="text-fg-tertiary hover:text-fg h-3 w-3 shrink-0 active:translate-y-0"
        aria-label={`Copy API key ID ${value}`}
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
  <TableCell className="py-[6px] text-left text-sm text-fg-tertiary">
    {lastUsedAt ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default border-b border-dotted border-fg-tertiary/40">
            {lastUsedLabel}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="font-mono text-xs">
          {toIsoUtcString(new Date(lastUsedAt))}
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
}: ApiKeyAddedCellProps) => (
  <TableCell className="py-[6px] text-left text-sm text-fg-tertiary">
    <div className="flex items-center gap-6">
      <span className="w-[92px] shrink-0 whitespace-nowrap">{addedDate}</span>
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
            <span>
              <UserAvatar email={createdBy.email} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">{createdBy.email}</TooltipContent>
        </Tooltip>
      ) : (
        <span className="size-5 shrink-0" aria-hidden />
      )}
      <Button
        type="button"
        variant="ghost"
        size="iconSm"
        className="text-fg-tertiary hover:text-fg shrink-0 active:translate-y-0"
        aria-label={`Delete ${keyName ?? 'API key'}`}
        onClick={onDelete}
      >
        <RemoveIcon className="size-4" />
      </Button>
    </div>
  </TableCell>
)

export const ApiKeysTableRow = ({ apiKey, teamSlug }: ApiKeysTableRowProps) => {
  const posthog = usePostHog()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const maskDisplay = `${apiKey.mask.prefix}${apiKey.mask.maskedValuePrefix}...${apiKey.mask.maskedValueSuffix}`
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

      <TableRow className="h-11">
        <ApiKeyNameCell name={apiKey.name} />
        <TableCell className="py-[6px] text-left">
          <ApiKeyIdBadge
            value={maskDisplay}
            onCopy={() => {
              posthog.capture('copied API key id')
            }}
          />
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
