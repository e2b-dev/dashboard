'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
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

  const stage: Stage = rollback.isSuccess
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

        <Footer
          stage={stage}
          errorMessage={rollback.error?.message ?? null}
          onSubmit={submit}
          onCancel={() => handleOpenChange(false)}
          onDismiss={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

type Stage = 'idle' | 'pending' | 'error' | 'success'

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

interface FooterProps {
  stage: Stage
  errorMessage: string | null
  onSubmit: () => void
  onCancel: () => void
  onDismiss: () => void
}

/**
 * The footer keeps a fixed-height inline message slot above the buttons so
 * the dialog doesn't jump when an error appears or clears. The slot is
 * present in idle/pending/error and collapsed in success (which has its
 * own full-width Dismiss button).
 */
function Footer({
  stage,
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
      <InlineMessage stage={stage} message={errorMessage} />
      {stage === 'pending' ? (
        <Button variant="secondary" className="w-full" loading="Rolling back" />
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
          <Button onClick={onSubmit}>Rollback</Button>
        </div>
      )}
    </DialogFooter>
  )
}

/**
 * Reserves a single-line slot for inline feedback so toggling between idle
 * and error doesn't shift the buttons below.
 */
function InlineMessage({
  stage,
  message,
}: {
  stage: Exclude<Stage, 'success'>
  message: string | null
}) {
  const text = stage === 'error' ? (message ?? 'Rollback failed.') : '\u00a0'
  return (
    <p
      aria-live="polite"
      className={
        stage === 'error'
          ? 'prose-body w-full min-h-5 text-center text-accent-error-highlight'
          : 'prose-body w-full min-h-5 text-center text-transparent select-none'
      }
    >
      {text}
    </p>
  )
}
