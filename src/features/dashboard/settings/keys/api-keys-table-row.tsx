'use client'

import { usePostHog } from 'posthog-js/react'
import type { MouseEvent } from 'react'
import { CLI_GENERATED_KEY_NAME } from '@/configs/api'
import type { TeamAPIKey } from '@/core/modules/keys/models'
import { UserAvatar } from '@/features/dashboard/shared'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { defaultSuccessToast, useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
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

const tableCellClassName = 'py-3 text-left [tr:first-child>&]:pt-1.5'

interface ApiKeysTableRowProps {
  apiKey: TeamAPIKey
  onDelete: () => void
}

export const ApiKeysTableRow = ({ apiKey, onDelete }: ApiKeysTableRowProps) => {
  const posthog = usePostHog()
  const { toast } = useToast()
  const [wasCopied, copy] = useClipboard()

  const addedDate = apiKey.createdAt
    ? (formatDate(new Date(apiKey.createdAt), 'MMM d, yyyy') ?? '—')
    : '—'

  const lastUsedAt = apiKey.lastUsed
  const lastUsedLabel = getLastUsedLabel(apiKey)
  const isCliKey = apiKey.name === CLI_GENERATED_KEY_NAME
  const displayId = getApiKeyIdBadgeLabel(apiKey.id)
  const createdByEmail = apiKey.createdBy?.email?.trim() || 'Unknown user'

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    await copy(apiKey.id)
    posthog.capture('copied API key id')
    toast(defaultSuccessToast('ID copied to clipboard'))
  }

  return (
    <TableRow>
        <TableCell className={tableCellClassName}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="border-stroke flex size-8 shrink-0 items-center justify-center border">
              <KeyIcon aria-hidden className="text-fg-tertiary size-4" />
            </div>
            <span
              className="text-fg min-w-0 truncate text-sm font-medium"
              title={apiKey.name ?? 'Untitled key'}
            >
              {apiKey.name ?? 'Untitled key'}
            </span>
          </div>
        </TableCell>
        <TableCell className={tableCellClassName}>
          <Badge className="bg-bg-highlight text-fg-tertiary h-[18px] gap-[3px] px-1 prose-label-numeric">
            <span className="tracking-wider">{displayId}</span>
            <Button
              type="button"
              variant="quaternary"
              size="none"
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
        </TableCell>
        <TableCell
          className={cn(tableCellClassName, 'text-sm text-fg-tertiary')}
        >
          {lastUsedAt ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">{lastUsedLabel}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-mono text-xs">
                {formatUTCTimestamp(new Date(lastUsedAt))}
              </TooltipContent>
            </Tooltip>
          ) : (
            lastUsedLabel
          )}
        </TableCell>
        <TableCell
          className={cn(
            tableCellClassName,
            'pl-3 pr-0 text-sm text-fg-tertiary'
          )}
        >
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
                  <TooltipContent side="top">
                    Added through E2B CLI
                  </TooltipContent>
                </Tooltip>
              ) : apiKey.createdBy ? (
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
                variant="quaternary"
                size="none"
                className="text-fg-tertiary hover:text-fg shrink-0 active:translate-y-0"
                aria-label={`Delete ${apiKey.name ?? 'API key'}`}
                onClick={onDelete}
              >
                <TrashIcon className="size-4" />
              </Button>
            </div>
          </div>
        </TableCell>
      </TableRow>
  )
}
