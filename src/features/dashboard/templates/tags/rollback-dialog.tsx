'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
} from '@/ui/primitives/dialog'
import { ArrowDivider } from './arrow-divider'
import {
  TagDialogBuildRow,
  TagDialogFooter,
  TagDialogStageTransition,
  TagDialogSuccess,
  TagDialogTitle,
} from './components'
import { trackTagTableInteraction } from './table-config'
import { useTagAssignmentMutation } from './use-tag-assignment-mutation'

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
  ...rest
}: RollbackTagDialogProps) {
  const [isPending, setIsPending] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (!next && isPending) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideClose={isPending}
        className="sm:max-w-[413px] sm:min-h-[224px] sm:h-[224px] flex flex-col"
        onPointerDownOutside={(e) => {
          if (isPending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isPending) e.preventDefault()
        }}
      >
        <RollbackTagDialogBody
          {...rest}
          onClose={() => onOpenChange(false)}
          onPendingChange={setIsPending}
        />
      </DialogContent>
    </Dialog>
  )
}

interface RollbackTagDialogBodyProps
  extends Omit<RollbackTagDialogProps, 'open' | 'onOpenChange'> {
  onClose: () => void
  onPendingChange: (pending: boolean) => void
}

function RollbackTagDialogBody({
  tag,
  currentBuildId,
  targetBuildId,
  teamSlug,
  templateId,
  templateName,
  surface,
  onRolledBack,
  onClose,
  onPendingChange,
}: RollbackTagDialogBodyProps) {
  const { mutation, stage } = useTagAssignmentMutation({
    teamSlug,
    templateId,
    operation: 'rollback',
    analyticsContext: { surface, tag },
    onSuccess: onRolledBack,
  })

  useEffect(() => {
    onPendingChange(mutation.isPending)
  }, [mutation.isPending, onPendingChange])

  useEffect(() => {
    trackTagTableInteraction('rollback opened', { surface, tag })
  }, [surface, tag])

  const submit = () => {
    trackTagTableInteraction('rollback submitted', { surface, tag })
    mutation.mutate({
      teamSlug,
      templateId,
      templateName,
      buildId: targetBuildId,
      tag,
    })
  }

  return (
    <TagDialogStageTransition phase={stage === 'success' ? 'success' : 'form'}>
      <DialogHeader>
        {stage === 'success' ? (
          <TagDialogTitle
            srOnly
            prefix="Rollback "
            tag={tag}
            suffix=" succeeded"
          />
        ) : (
          <TagDialogTitle prefix="Rollback " tag={tag} />
        )}
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
        errorMessage={mutation.error?.message ?? null}
        submitLabel="Rollback"
        pendingLabel="Rolling back"
        onSubmit={submit}
        onCancel={onClose}
        onDismiss={onClose}
      />
    </TagDialogStageTransition>
  )
}
