'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import { AlertDialog } from '@/ui/alert-dialog'
import { WarningIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'

interface TagDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag: string
  teamSlug: string
  templateId: string
  templateName: string
}

export default function TagDeleteDialog({
  open,
  onOpenChange,
  tag,
  teamSlug,
  templateId,
  templateName,
}: TagDeleteDialogProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const tagsQueryKey = trpc.templates.getTagGroups.queryKey({
    teamSlug,
    templateId,
  })

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

        await queryClient.cancelQueries({ queryKey: tagsQueryKey })

        queryClient.setQueryData(tagsQueryKey, (old) => {
          if (!old?.tags) return old
          const removed = new Set(variables.tags)
          return {
            ...old,
            tags: old.tags.filter((t) => !removed.has(t.tag)),
          }
        })
      },
      onError: (error) => {
        toast(
          defaultErrorToast(error.message || `Failed to delete tag ${tag}.`)
        )
      },
      onSettled: () => {
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: tagsQueryKey })
      },
    })
  )

  const isDeleting = deleteTags.isPending

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2 text-accent-error-highlight">
          <WarningIcon className="size-4" />
          <span>{`Delete '${tag}' tag?`}</span>
        </span>
      }
      description="Any associated history will be also deleted. This action is irreversible."
      confirm={
        isDeleting ? (
          <>
            <Loader variant="slash" />
            <span>Deleting...</span>
          </>
        ) : (
          'Delete'
        )
      }
      confirmProps={{
        variant: 'error',
        disabled: isDeleting,
      }}
      onConfirm={() => {
        deleteTags.mutate({
          teamSlug,
          templateId,
          templateName,
          tags: [tag],
        })
      }}
    />
  )
}
