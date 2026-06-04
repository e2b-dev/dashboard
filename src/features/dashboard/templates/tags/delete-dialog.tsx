'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
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
import { WarningIcon } from '@/ui/primitives/icons'

interface TagDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag: string
  teamSlug: string
  templateId: string
  templateName: string
  onDeleted?: () => void | Promise<void>
}

export default function TagDeleteDialog({
  open,
  onOpenChange,
  tag,
  teamSlug,
  templateId,
  templateName,
  onDeleted,
}: TagDeleteDialogProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const tagGroupsQueryKey = trpc.templates.getTagGroups.infiniteQueryOptions({
    teamSlug,
    templateId,
  }).queryKey
  const tagCountQueryKey = trpc.templates.getTagCount.queryOptions({
    teamSlug,
    templateId,
  }).queryKey

  const deleteTags = useMutation(
    trpc.templates.deleteTags.mutationOptions({
      onSuccess: async (_, variables) => {
        const deletedTag = variables.tags[0] ?? tag
        toast(
          defaultSuccessToast(
            <>
              Tag <span className="prose-body-highlight">{deletedTag}</span> has
              been deleted.
            </>
          )
        )

        await onDeleted?.()
      },
      onError: (error) => {
        toast(
          defaultErrorToast(error.message || `Failed to delete tag ${tag}.`)
        )
      },
      onSettled: async () => {
        onOpenChange(false)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: tagGroupsQueryKey }),
          queryClient.invalidateQueries({ queryKey: tagCountQueryKey }),
        ])
      },
    })
  )

  const isDeleting = deleteTags.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="gap-0 sm:max-w-[520px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <DialogHeader className="min-w-0 flex-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-accent-error-highlight">
              <WarningIcon className="size-4 shrink-0" />
              <span>{`Delete '${tag}' tag?`}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirm deletion of this tag. This cannot be undone.
            </DialogDescription>
            <p className="text-fg-primary mt-2 font-sans text-sm">
              Any associated history will be also deleted. This action is
              irreversible.
            </p>
          </DialogHeader>
          <div className="flex shrink-0 items-center justify-end gap-5">
            <DialogClose asChild>
              <Button
                type="button"
                variant="tertiary"
                disabled={isDeleting}
                className="text-fg-tertiary font-sans normal-case hover:text-fg-tertiary focus:text-fg-tertiary"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="error"
              loading={isDeleting ? 'Deleting' : undefined}
              disabled={isDeleting}
              className="font-sans normal-case min-w-[98px]"
              onClick={() => {
                deleteTags.mutate({
                  teamSlug,
                  templateId,
                  templateName,
                  tags: [tag],
                })
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
