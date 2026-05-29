'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/ui'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { CheckIcon } from '@/ui/primitives/icons'
import { ArrowDivider } from './arrow-divider'
import BuildPicker, { type BuildSelectionSource } from './build-picker'
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

type Stage = 'idle' | 'pending' | 'error' | 'success'

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
        await queryClient.invalidateQueries({
          queryKey: trpc.templates.getTagGroups.queryKey({
            teamSlug,
            templateId,
          }),
        })
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

  const stage: Stage = reassign.isSuccess
    ? 'success'
    : reassign.isPending
      ? 'pending'
      : reassign.isError
        ? 'error'
        : 'idle'

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
        className="sm:max-w-[425px] sm:h-[436px]"
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
          <SuccessBody tag={tag} />
        ) : (
          <div className="flex flex-col gap-2">
            <BuildRow label="Current" buildId={currentBuildId} />
            <ArrowDivider />
            <BuildRow
              label="Target"
              buildId={selectedBuildId ?? '--'}
              dim={selectedBuildId === null}
            />
            <BuildPicker
              open={open}
              teamSlug={teamSlug}
              templateId={templateId}
              selectedBuildId={selectedBuildId}
              onSelect={handleSelect}
              disabled={stage === 'pending'}
            />
          </div>
        )}

        <Footer
          stage={stage}
          canSubmit={canSubmit}
          warning={
            isSameAsCurrent
              ? `This build is currently assigned to ‘${tag}’.`
              : null
          }
          errorMessage={reassign.error?.message ?? null}
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
  dim?: boolean
}

function BuildRow({ label, buildId, dim }: BuildRowProps) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <span className="prose-label-highlight uppercase text-fg-tertiary w-14 shrink-0">
        {label}
      </span>
      <span
        className={cn(
          'prose-body font-mono truncate',
          dim ? 'text-fg-tertiary' : 'text-fg-primary'
        )}
      >
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
        reassigned successfully
      </p>
    </div>
  )
}

interface FooterProps {
  stage: Stage
  canSubmit: boolean
  warning: string | null
  errorMessage: string | null
  onSubmit: () => void
  onCancel: () => void
  onDismiss: () => void
}

function Footer({
  stage,
  canSubmit,
  warning,
  errorMessage,
  onSubmit,
  onCancel,
  onDismiss,
}: FooterProps) {
  if (stage === 'success') {
    return (
      <DialogFooter className="sm:flex-row mt-auto">
        <Button autoFocus className="w-full" onClick={onDismiss}>
          Dismiss
        </Button>
      </DialogFooter>
    )
  }

  return (
    <DialogFooter className="flex-col gap-2 sm:flex-col">
      <InlineMessage
        stage={stage}
        warning={warning}
        errorMessage={errorMessage}
      />
      {stage === 'pending' ? (
        <Button variant="secondary" className="w-full" loading="Reassigning" />
      ) : stage === 'error' ? (
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button autoFocus onClick={onSubmit}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={onSubmit}>
            Reassign
          </Button>
        </div>
      )}
    </DialogFooter>
  )
}

/**
 * Reserves a single-line slot between body and buttons so transitioning
 * between idle / warning / error doesn't shift the footer below.
 */
function InlineMessage({
  stage,
  warning,
  errorMessage,
}: {
  stage: Exclude<Stage, 'success'>
  warning: string | null
  errorMessage: string | null
}) {
  const tone: 'error' | 'warning' | null =
    stage === 'error' ? 'error' : warning ? 'warning' : null
  const text =
    stage === 'error'
      ? (errorMessage ?? 'Reassign failed.')
      : (warning ?? '\u00a0')

  return (
    <p
      aria-live="polite"
      className={cn(
        'prose-body w-full min-h-5 text-center',
        tone === 'error' && 'text-accent-error-highlight',
        tone === 'warning' && 'text-accent-warning-highlight',
        tone === null && 'text-transparent select-none'
      )}
    >
      {text}
    </p>
  )
}
