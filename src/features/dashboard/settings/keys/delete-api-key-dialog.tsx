'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FC } from 'react'
import type { TeamAPIKey } from '@/core/modules/keys/models'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { formatRelativeAgo } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { TrashIcon } from '@/ui/primitives/icons'

interface DeleteApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamSlug: string
  apiKey: TeamAPIKey
}

export const DeleteApiKeyDialog: FC<DeleteApiKeyDialogProps> = ({
  open,
  onOpenChange,
  teamSlug,
  apiKey,
}) => {
  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const listQueryKey = trpc.teams.listApiKeys.queryOptions({
    teamSlug,
  }).queryKey

  const deleteMutation = useMutation(
    trpc.teams.deleteApiKey.mutationOptions({
      onSuccess: () => {
        toast(defaultSuccessToast('API key has been deleted.'))
        onOpenChange(false)
        void queryClient.invalidateQueries({ queryKey: listQueryKey })
      },
      onError: (err) => {
        toast(defaultErrorToast(err.message || 'Failed to delete API key.'))
        onOpenChange(false)
      },
    })
  )

  const keyLabel = apiKey.name.trim() ? apiKey.name : 'Untitled'
  const lastUsedAt = apiKey.lastUsed
  const lastUsedLabel = lastUsedAt
    ? `Last used: ${formatRelativeAgo(new Date(lastUsedAt))}`
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="gap-0 sm:max-w-[520px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <DialogHeader className="min-w-0 flex-1 text-left">
            <DialogTitle>{`Delete '${keyLabel}' key?`}</DialogTitle>
            <DialogDescription className="sr-only">
              Confirm deletion of this API key. This cannot be undone.
            </DialogDescription>
            {lastUsedLabel ? (
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-fg-secondary font-sans text-sm">
                  Deleting this key will immediately disable all associated
                  applications
                </p>
                <p className="text-fg-tertiary font-sans text-sm">
                  {lastUsedLabel}
                </p>
              </div>
            ) : (
              <p className="text-fg-secondary mt-2 font-sans text-sm">
                It was never used
              </p>
            )}
          </DialogHeader>
          <div className="flex shrink-0 items-center justify-end gap-5">
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="slate"
                disabled={deleteMutation.isPending}
                className="text-fg-tertiary font-sans normal-case hover:text-fg-tertiary focus:text-fg-tertiary"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="error"
              size="md"
              loading={deleteMutation.isPending}
              disabled={deleteMutation.isPending}
              className="gap-2 font-sans normal-case"
              onClick={() => {
                deleteMutation.mutate({ teamSlug, apiKeyId: apiKey.id })
              }}
            >
              <TrashIcon className="size-4" aria-hidden />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
