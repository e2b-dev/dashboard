'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTRPC } from '@/trpc/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { ArrowDivider } from './arrow-divider'
import {
  TagDialogBuildRow,
  TagDialogFooter,
  TagDialogSuccess,
} from './components'
import { tagDialogStageFromMutation } from './helpers'
import { trackTagTableInteraction } from './table-config'

export type RollbackSurface = 'tags-tab' | 'history-header' | 'history-row'

interface RollbackTagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag: string
  currentBuildId: string
  targetBuildId: string
  teamSlug: string
  templateId: string
  templateName: string
  surface: RollbackSurface
  onRolledBack?: () => void | Promise<void>
}

export default function RollbackTagDialog({
  open,
  onOpenChange,
  tag,
  currentBuildId,
  targetBuildId,
  teamSlug,
  templateId,
  templateName,
  surface,
  onRolledBack,
}: RollbackTagDialogProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const rollback = useMutation(
    trpc.templates.assignTag.mutationOptions({
      onSuccess: async () => {
        trackTagTableInteraction('rollback succeeded', { surface, tag })
        await queryClient.invalidateQueries({
          queryKey: trpc.templates.getTagGroups.queryKey({
            teamSlug,
            templateId,
          }),
        })
        await onRolledBack?.()
      },
      onError: (error) => {
        trackTagTableInteraction('rollback failed', {
          surface,
          tag,
          error_status: error.data?.httpStatus ?? null,
          error_code: error.data?.code ?? null,
        })
      },
    })
  )

  const stage = tagDialogStageFromMutation(rollback)

  const { reset } = rollback
  useEffect(() => {
    if (!open) return
    trackTagTableInteraction('rollback opened', { surface, tag })
    reset()
  }, [open, surface, tag, reset])

  const handleOpenChange = (next: boolean) => {
    if (rollback.isPending) return
    onOpenChange(next)
  }

  const submit = () => {
    trackTagTableInteraction('rollback submitted', { surface, tag })
    rollback.mutate({
      teamSlug,
      templateId,
      templateName,
      buildId: targetBuildId,
      tag,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideClose={stage === 'pending'}
        className="sm:max-w-[413px] sm:min-h-[224px] sm:h-[224px]"
        onPointerDownOutside={(e) => {
          if (stage === 'pending') e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (stage === 'pending') e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className={stage === 'success' ? 'sr-only' : undefined}>
            {stage === 'success'
              ? `Rollback ‘${tag}’ succeeded`
              : `Rollback ‘${tag}’`}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {stage === 'success'
              ? `Tag ${tag} rolled back to build ${targetBuildId}.`
              : `Reassign tag ${tag} from the current build to the target build.`}
          </DialogDescription>
        </DialogHeader>

        {stage === 'success' ? (
          <TagDialogSuccess tag={tag} message="rolled back successfully" />
        ) : (
          <div className="flex flex-col gap-2">
            <TagDialogBuildRow label="Current" buildId={currentBuildId} />
            <ArrowDivider />
            <TagDialogBuildRow label="Target" buildId={targetBuildId} />
          </div>
        )}

        <TagDialogFooter
          stage={stage}
          canSubmit
          errorMessage={rollback.error?.message ?? null}
          submitLabel="Rollback"
          pendingLabel="Rolling back"
          onSubmit={submit}
          onCancel={() => handleOpenChange(false)}
          onDismiss={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
