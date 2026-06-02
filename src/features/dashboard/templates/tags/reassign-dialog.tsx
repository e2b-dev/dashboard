'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTRPC } from '@/trpc/client'
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
  TagDialogSuccess,
} from './components'
import { tagDialogStageFromMutation } from './helpers'
import { trackTagTableInteraction } from './table-config'

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
  tag,
  currentBuildId,
  teamSlug,
  templateId,
  templateName,
  surface,
  onReassigned,
}: ReassignTagDialogProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null)
  const [selectionSource, setSelectionSource] =
    useState<BuildSelectionSource | null>(null)

  const reassign = useMutation(
    trpc.templates.assignTag.mutationOptions({
      onSuccess: async () => {
        trackTagTableInteraction('reassign succeeded', { surface, tag })
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.templates.getTagGroups.infiniteQueryOptions({
              teamSlug,
              templateId,
            }).queryKey,
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.templates.getTagCount.queryOptions({
              teamSlug,
              templateId,
            }).queryKey,
          }),
        ])
        await onReassigned?.()
      },
      onError: (error) => {
        trackTagTableInteraction('reassign failed', {
          surface,
          tag,
          error_status: error.data?.httpStatus ?? null,
          error_code: error.data?.code ?? null,
        })
      },
    })
  )

  const stage = tagDialogStageFromMutation(reassign)

  const { reset } = reassign
  useEffect(() => {
    if (!open) return
    trackTagTableInteraction('reassign opened', { surface, tag })
    setSelectedBuildId(null)
    setSelectionSource(null)
    reset()
  }, [open, surface, tag, reset])

  const handleOpenChange = (next: boolean) => {
    if (reassign.isPending) return
    onOpenChange(next)
  }

  const handleSelect = (id: string | null, source: BuildSelectionSource) => {
    setSelectedBuildId(id)
    setSelectionSource(id ? source : null)
    if (reassign.isError) reassign.reset()
  }

  const isSameAsCurrent =
    selectedBuildId !== null && selectedBuildId === currentBuildId
  const canSubmit =
    stage === 'idle' && selectedBuildId !== null && !isSameAsCurrent

  const submit = () => {
    if (!canSubmit || !selectedBuildId) return
    trackTagTableInteraction('reassign submitted', {
      surface,
      tag,
      via_search: selectionSource === 'search',
    })
    reassign.mutate({
      teamSlug,
      templateId,
      templateName,
      buildId: selectedBuildId,
      tag,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideClose={stage === 'pending'}
        className="sm:max-w-[430px] sm:h-[406px]"
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
          errorMessage={reassign.error?.message ?? null}
          submitLabel="Reassign"
          pendingLabel="Reassigning"
          onSubmit={submit}
          onCancel={() => handleOpenChange(false)}
          onDismiss={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
