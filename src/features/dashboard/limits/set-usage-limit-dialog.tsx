'use client'

import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import { WarningIcon } from '@/ui/primitives/icons'

interface SetUsageLimitDialogProps {
  confirmDisabled: boolean
  loading: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  triggerDisabled: boolean
  title: string
}

export const SetUsageLimitDialog = ({
  confirmDisabled,
  loading,
  onConfirm,
  onOpenChange,
  open,
  title,
  triggerDisabled,
}: SetUsageLimitDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="primary"
          className="font-sans normal-case"
          disabled={triggerDisabled}
        >
          Set
        </Button>
      </DialogTrigger>
      <DialogContent hideClose className="max-w-[505px] pr-8 sm:max-w-[505px]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 shrink-0">
                <WarningIcon className="text-accent-warning-highlight size-4" />
              </div>
              <DialogTitle className="text-fg">{title}</DialogTitle>
            </div>
            <DialogDescription className="text-fg-secondary prose-body max-w-[311px]">
              If your API usage hits this limit, all requests—including sandbox
              creation—will be blocked.
            </DialogDescription>
            <p className="text-accent-warning-highlight prose-body-highlight">
              This may disrupt your services.
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 self-end sm:self-center">
            <Button
              type="button"
              variant="quaternary"
              className="font-sans normal-case"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="font-sans normal-case"
              disabled={confirmDisabled}
              loading={loading ? 'Setting...' : undefined}
              onClick={onConfirm}
            >
              Set
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
