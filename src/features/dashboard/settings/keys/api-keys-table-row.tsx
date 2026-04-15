'use client'

import { usePostHog } from 'posthog-js/react'
import { useState } from 'react'
import { CLI_GENERATED_KEY_NAME } from '@/configs/api'
import type { TeamAPIKey } from '@/core/modules/keys/models'
import { formatDate } from '@/lib/utils/formatting'
import { E2BLogo } from '@/ui/brand'
import CopyButton from '@/ui/copy-button'
import { Avatar, AvatarFallback } from '@/ui/primitives/avatar'
import { Button } from '@/ui/primitives/button'
import { KeyIcon, TrashIcon } from '@/ui/primitives/icons'
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

const initialsFromEmail = (email: string) => {
  const local = email.split('@')[0] ?? '?'
  if (local.length <= 2) return local.toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

export const ApiKeysTableRow = ({ apiKey, teamSlug }: ApiKeysTableRowProps) => {
  const posthog = usePostHog()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const maskDisplay = `${apiKey.mask.prefix}${apiKey.mask.maskedValuePrefix}...${apiKey.mask.maskedValueSuffix}`
  const copyValue = maskDisplay

  const addedDate = apiKey.createdAt
    ? formatDate(new Date(apiKey.createdAt), 'MMM d, yyyy')
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

      <TableRow className="group h-11">
        <TableCell className="text-left">
          <div className="flex items-center gap-2">
            <KeyIcon
              aria-hidden
              className="text-fg-tertiary size-4 shrink-0 opacity-80"
            />
            <span className="prose-table text-fg-secondary font-sans">
              {apiKey.name}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-left">
          <div className="bg-bg-1 border-stroke inline-flex max-w-full items-center gap-1 rounded border px-2 py-1 font-mono text-xs">
            <span className="text-fg-secondary truncate">{maskDisplay}</span>
            <CopyButton
              value={copyValue}
              className="size-7 shrink-0"
              size="iconSm"
              variant="ghost"
              onCopy={() => {
                posthog.capture('copied API key id')
              }}
            />
          </div>
        </TableCell>
        <TableCell className="text-fg-tertiary font-sans">
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
        <TableCell className="text-fg-secondary">
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs">{addedDate}</span>
            {isCliKey ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-fg-tertiary size-5 shrink-0 p-0"
                    aria-label="Added through E2B CLI"
                  >
                    <E2BLogo className="size-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Added through E2B CLI
                </TooltipContent>
              </Tooltip>
            ) : apiKey.createdBy ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="size-6 border-stroke">
                    <AvatarFallback className="text-[10px]">
                      {initialsFromEmail(apiKey.createdBy.email)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {apiKey.createdBy.email}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            className="text-fg-tertiary opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            aria-label={`Delete ${apiKey.name}`}
            onClick={() => setDeleteOpen(true)}
          >
            <TrashIcon className="size-4" />
          </Button>
        </TableCell>
      </TableRow>
    </>
  )
}
