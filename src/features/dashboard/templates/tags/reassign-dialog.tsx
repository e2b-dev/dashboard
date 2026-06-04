'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { ArrowDivider } from './arrow-divider'
import BuildPicker, { type BuildSelectionSource } from './build-picker'
import {
  TagDialogBuildRow,
  TagDialogFooter,
  TagDialogStageTransition,
  TagDialogSuccess,
} from './components'
import { trackTagTableInteraction } from './table-config'
import { useTagAssignmentMutation } from './use-tag-assignment-mutation'

export type ReassignSurface = 'tags-tab' | 'history-header'

interface ReassignTagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag: string
  currentBuildId: string
  teamSlug: string
  templateId: string
  templateName: string
  surface: ReassignSurface
  onReassigned?: () => void | Promise<void>
}

export default function ReassignTagDialog({
  open,
  onOpenChange,
  ...rest
}: ReassignTagDialogProps) {
  const [isPending, setIsPending] = useState(false)
  const isPendingRef = useRef(false)
  isPendingRef.current = isPending

  const handleOpenChange = (next: boolean) => {
    if (!next && isPendingRef.current) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideClose={isPending}
        className="sm:max-w-[440px] sm:h-[406px] flex flex-col"
        onPointerDownOutside={(e) => {
          if (isPendingRef.current) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isPendingRef.current) e.preventDefault()
        }}
      >
        <ReassignTagDialogBody
          {...rest}
          open={open}
          onClose={() => onOpenChange(false)}
          onPendingChange={setIsPending}
        />
      </DialogContent>
    </Dialog>
  )
}

interface ReassignTagDialogBodyProps
  extends Omit<ReassignTagDialogProps, 'open' | 'onOpenChange'> {
  open: boolean
  onClose: () => void
  onPendingChange: (pending: boolean) => void
}

function ReassignTagDialogBody({
  open,
  tag,
  currentBuildId,
  teamSlug,
  templateId,
  templateName,
  surface,
  onReassigned,
  onClose,
  onPendingChange,
}: ReassignTagDialogBodyProps) {
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null)
  const [selectionSource, setSelectionSource] =
    useState<BuildSelectionSource | null>(null)

  const { mutation, stage } = useTagAssignmentMutation({
    teamSlug,
    templateId,
    operation: 'reassign',
    analyticsContext: { surface, tag },
    onSuccess: onReassigned,
  })

  useEffect(() => {
    onPendingChange(mutation.isPending)
  }, [mutation.isPending, onPendingChange])

  useEffect(() => {
    trackTagTableInteraction('reassign opened', { surface, tag })
  }, [surface, tag])

  const handleSelect = (id: string | null, source: BuildSelectionSource) => {
    setSelectedBuildId(id)
    setSelectionSource(id ? source : null)
    if (mutation.isError) mutation.reset()
  }

  const isSameAsCurrent =
    selectedBuildId !== null && selectedBuildId === currentBuildId
  const canSubmit = selectedBuildId !== null && !isSameAsCurrent

  const submit = () => {
    if (!canSubmit || !selectedBuildId) return
    trackTagTableInteraction('reassign submitted', {
      surface,
      tag,
      via_search: selectionSource === 'search',
    })
    mutation.mutate({
      teamSlug,
      templateId,
      templateName,
      buildId: selectedBuildId,
      tag,
    })
  }

  return (
    <TagDialogStageTransition phase={stage === 'success' ? 'success' : 'form'}>
      <DialogHeader>
        <DialogTitle className={stage === 'success' ? 'sr-only' : undefined}>
          {stage === 'success'
            ? `‘${tag}’ reassigned successfully`
            : `reassign ‘${tag}’`}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {stage === 'success'
            ? `Tag ${tag} reassigned.`
            : `Reassign tag ${tag} from the current build to a different build.`}
        </DialogDescription>
      </DialogHeader>

      {stage === 'success' ? (
        <TagDialogSuccess tag={tag} message="reassigned successfully" />
      ) : (
        <div className="flex flex-col gap-2">
          <TagDialogBuildRow label="Current" buildId={currentBuildId} />
          <ArrowDivider />
          <TagDialogBuildRow
            label="Target"
            buildId={selectedBuildId ?? '--'}
            dim={selectedBuildId === null}
          />
          <BuildPicker
            open={open}
            teamSlug={teamSlug}
            templateId={templateId}
            currentBuildId={currentBuildId}
            selectedBuildId={selectedBuildId}
            onSelect={handleSelect}
            disabled={stage === 'pending'}
          />
        </div>
      )}

      <TagDialogFooter
        stage={stage}
        canSubmit={canSubmit}
        errorMessage={mutation.error?.message ?? null}
        submitLabel="Reassign"
        pendingLabel="Reassigning"
        onSubmit={submit}
        onCancel={onClose}
        onDismiss={onClose}
      />
    </TagDialogStageTransition>
  )
}
