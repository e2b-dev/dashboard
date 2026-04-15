'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Key, Sparkles, Trash2 } from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { useState } from 'react'
import { CLI_GENERATED_KEY_NAME } from '@/configs/api'
import type { TeamAPIKey } from '@/core/modules/keys/models'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { formatDate } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { AlertDialog } from '@/ui/alert-dialog'
import CopyButton from '@/ui/copy-button'
import { Avatar, AvatarFallback } from '@/ui/primitives/avatar'
import { Button } from '@/ui/primitives/button'
import { TableCell, TableRow } from '@/ui/primitives/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/ui/primitives/tooltip'
import {
  formatShortRelativeAgo,
  getLastUsedLabel,
  toIsoUtcString,
} from './api-keys-utils'

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
  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const listQueryKey = trpc.teams.listApiKeys.queryOptions({
    teamSlug,
  }).queryKey

  const deleteMutation = useMutation(
    trpc.teams.deleteApiKey.mutationOptions({
      onSuccess: () => {
        toast(defaultSuccessToast('API key has been deleted.'))
        setDeleteOpen(false)
        void queryClient.invalidateQueries({ queryKey: listQueryKey })
      },
      onError: (err) => {
        toast(defaultErrorToast(err.message || 'Failed to delete API key.'))
        setDeleteOpen(false)
      },
    })
  )

  const maskDisplay = `${apiKey.mask.prefix}${apiKey.mask.maskedValuePrefix}...${apiKey.mask.maskedValueSuffix}`
  const copyValue = maskDisplay

  const addedDate = apiKey.createdAt
    ? formatDate(new Date(apiKey.createdAt), 'MMM d, yyyy')
    : '—'

  const lastUsedAt = apiKey.lastUsed
  const lastUsedLabel = getLastUsedLabel(apiKey)
  const hasLastUsedTimestamp = Boolean(lastUsedAt)
  const isCliKey = apiKey.name === CLI_GENERATED_KEY_NAME
  const isNeverUsed = !apiKey.lastUsed

  const deleteTitle = `DELETE '${apiKey.name}' KEY?`

  const deleteDescription = isNeverUsed ? (
    <span className="text-fg-tertiary text-sm">It was never used</span>
  ) : (
    <div className="flex flex-col gap-2 text-left">
      <p className="text-fg-tertiary text-sm">
        Deleting this key will immediately disable all associated applications
      </p>
      {lastUsedAt ? (
        <p className="text-fg-tertiary text-sm">
          Last used: {formatShortRelativeAgo(new Date(lastUsedAt))}
        </p>
      ) : null}
    </div>
  )

  return (
    <>
      <AlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={deleteTitle}
        description={deleteDescription}
        confirm={
          <span className="inline-flex items-center gap-1.5">
            <Trash2 className="size-4" aria-hidden />
            Delete
          </span>
        }
        confirmProps={{
          disabled: deleteMutation.isPending,
          loading: deleteMutation.isPending,
        }}
        onConfirm={() => {
          deleteMutation.mutate({ teamSlug, apiKeyId: apiKey.id })
        }}
      />

      <TableRow className="group h-11">
        <TableCell className="text-left">
          <div className="flex items-center gap-2">
            <Key
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
          {hasLastUsedTimestamp ? (
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
                  <span className="inline-flex">
                    <Sparkles
                      aria-label="Added through E2B CLI"
                      className="text-fg size-4"
                    />
                  </span>
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
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="size-4" />
          </Button>
        </TableCell>
      </TableRow>
    </>
  )
}
