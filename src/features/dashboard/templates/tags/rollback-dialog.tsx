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
import { CheckIcon } from '@/ui/primitives/icons'
import { ArrowDivider } from './arrow-divider'
import { trackTagTableInteraction } from './table-config'
import { TagDialogFooter, type TagDialogStage } from './tag-dialog-footer'

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

  const stage: TagDialogStage = rollback.isSuccess
    ? 'success'
    : rollback.isPending
      ? 'pending'
      : rollback.isError
        ? 'error'
        : 'idle'

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
          <SuccessBody tag={tag} />
        ) : (
          <div className="flex flex-col gap-2">
            <BuildRow label="Current" buildId={currentBuildId} />
            <ArrowDivider />
            <BuildRow label="Target" buildId={targetBuildId} />
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

interface BuildRowProps {
  label: string
  buildId: string
}

function BuildRow({ label, buildId }: BuildRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="prose-label-highlight uppercase text-fg-tertiary w-14 shrink-0">
        {label}
      </span>
      <span className="prose-body font-mono text-fg-primary truncate">
        {buildId}
      </span>
    </div>
  )
}

function SuccessBody({ tag }: { tag: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <CheckIcon className="size-12 text-accent-positive-highlight" />
      <p className="prose-headline-small uppercase text-fg">
        <span className="font-mono">‘{tag}’</span>
        <br />
        rolled back successfully
      </p>
    </div>
  )
}
