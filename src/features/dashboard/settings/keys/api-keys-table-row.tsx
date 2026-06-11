'use client'

import { usePostHog } from 'posthog-js/react'
import { CLI_GENERATED_KEY_NAME } from '@/configs/api'
import type { TeamAPIKey } from '@/core/modules/keys/models'
import { IdBadge, UserAvatar } from '@/features/dashboard/shared'
import {
  formatZonedDate,
  formatZonedExactTimestamp,
  useTimezone,
} from '@/features/dashboard/timezone'
import { defaultSuccessToast, useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { E2BSquareBadge } from '@/ui/brand'
import { Button } from '@/ui/primitives/button'
import { KeyIcon, RemoveIcon } from '@/ui/primitives/icons'
import { TableCell, TableRow } from '@/ui/primitives/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/ui/primitives/tooltip'
import { formatMaskedApiKey, getLastUsedLabel } from './api-keys-utils'

const tableCellClassName = 'py-3 text-left [tr:first-child>&]:pt-1.5'

interface ApiKeysTableRowProps {
  apiKey: TeamAPIKey
  onDelete: () => void
}

export const ApiKeysTableRow = ({ apiKey, onDelete }: ApiKeysTableRowProps) => {
  const posthog = usePostHog()
  const { toast } = useToast()
  const { timezone } = useTimezone()

  const addedDate = apiKey.createdAt
    ? (formatZonedDate(apiKey.createdAt, timezone) ?? '—')
    : '—'

  const maskedKey = formatMaskedApiKey(apiKey)
  const lastUsedAt = apiKey.lastUsed
  const lastUsedLabel = getLastUsedLabel(apiKey)
  const isCliKey = apiKey.name === CLI_GENERATED_KEY_NAME
  const createdByEmail = apiKey.createdBy?.email?.trim() || 'Unknown user'

  const handleIdCopied = () => {
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
        <span className="text-fg-tertiary truncate font-mono text-sm tabular-nums">
          {maskedKey}
        </span>
      </TableCell>
      <TableCell className={tableCellClassName}>
        <IdBadge
          id={apiKey.id}
          copyAriaLabel="Copy full API key ID"
          onCopied={handleIdCopied}
        />
      </TableCell>
      <TableCell className={cn(tableCellClassName, 'text-sm text-fg-tertiary')}>
        {lastUsedAt ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default">{lastUsedLabel}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-mono text-xs">
              {formatZonedExactTimestamp(lastUsedAt, timezone)}
            </TooltipContent>
          </Tooltip>
        ) : (
          lastUsedLabel
        )}
      </TableCell>
      <TableCell className={cn(tableCellClassName, 'text-sm text-fg-tertiary')}>
        <div className="flex items-center gap-3">
          <span className="block w-[92px] shrink-0 whitespace-nowrap">
            {addedDate}
          </span>
          <div className="flex items-center gap-3">
            {isCliKey ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    <E2BSquareBadge />
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
                    <UserAvatar label={createdByEmail} />
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
              <RemoveIcon className="size-4" />
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
