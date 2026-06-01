'use client'

import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils/ui'
import { Button } from '@/ui/primitives/button'
import { DialogFooter } from '@/ui/primitives/dialog'
import { Loader } from '@/ui/primitives/loader'

export type TagDialogStage = 'idle' | 'pending' | 'error' | 'success'

type BaseProps = {
  stage: TagDialogStage
  canSubmit: boolean
  errorMessage: string | null
  submitLabel: string
  pendingLabel: string
  onCancel: () => void
  onDismiss: () => void
}

type SubmitWiring =
  | { formId: string; onSubmit?: never }
  | { formId?: never; onSubmit: () => void }

type Props = BaseProps & SubmitWiring

export function TagDialogFooter({
  stage,
  canSubmit,
  errorMessage,
  submitLabel,
  pendingLabel,
  onCancel,
  onDismiss,
  formId,
  onSubmit,
}: Props) {
  const submitTrigger: ComponentProps<typeof Button> = formId
    ? { type: 'submit', form: formId }
    : { onClick: onSubmit }

  switch (stage) {
    case 'success':
      return (
        <DialogFooter className="sm:flex-row mt-auto">
          <Button autoFocus className="w-full" onClick={onDismiss}>
            Dismiss
          </Button>
        </DialogFooter>
      )
    case 'pending':
      return (
        <DialogFooter className="flex-col gap-2 sm:flex-col mt-auto">
          <InlineMessage stage={stage} errorMessage={errorMessage} />
          <div className="flex w-full items-center justify-center gap-2 py-2">
            <Loader variant="slash" size="sm" />
            <span className="prose-body text-fg-secondary">
              {pendingLabel}…
            </span>
          </div>
        </DialogFooter>
      )
    case 'error':
      return (
        <DialogFooter className="flex-col gap-2 sm:flex-col mt-auto">
          <InlineMessage stage={stage} errorMessage={errorMessage} />
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button autoFocus {...submitTrigger}>
              Retry
            </Button>
          </div>
        </DialogFooter>
      )
    default:
      return (
        <DialogFooter className="flex-col gap-2 sm:flex-col mt-auto">
          <InlineMessage stage={stage} errorMessage={errorMessage} />
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button disabled={!canSubmit} {...submitTrigger}>
              {submitLabel}
            </Button>
          </div>
        </DialogFooter>
      )
  }
}

function InlineMessage({
  stage,
  errorMessage,
}: {
  stage: Exclude<TagDialogStage, 'success'>
  errorMessage: string | null
}) {
  const isError = stage === 'error'
  const text = isError ? (errorMessage ?? 'Action failed.') : '\u00a0'

  return (
    <p
      aria-live="polite"
      className={cn(
        'prose-body w-full min-h-5 text-center',
        isError ? 'text-accent-error-highlight' : 'text-transparent select-none'
      )}
    >
      {text}
    </p>
  )
}
