'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FC, ReactNode } from 'react'
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
  DialogFooter,
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

  const title = `DELETE '${apiKey.name}' KEY?`
  const lastUsedAt = apiKey.lastUsed
  const isNeverUsed = !lastUsedAt

  const body: ReactNode = isNeverUsed ? (
    <span className="text-fg-tertiary font-sans text-sm">
      It was never used
    </span>
  ) : (
    <div className="flex flex-col gap-2 text-left">
      <p className="text-fg-tertiary font-sans text-sm">
        Deleting this key will immediately disable all associated applications
      </p>
      {lastUsedAt ? (
        <p className="text-fg-tertiary font-sans text-sm">
          Last used: {formatRelativeAgo(new Date(lastUsedAt))}
        </p>
      ) : null}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose>
        <DialogHeader className="border-stroke border-b px-5 py-4">
          <DialogTitle className="text-fg">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Confirm deletion of this API key. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-5">{body}</div>
        <DialogFooter className="border-stroke bg-bg/30 border-t px-5 py-4 sm:justify-end sm:gap-3">
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="text-fg-secondary font-sans normal-case hover:text-fg"
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
