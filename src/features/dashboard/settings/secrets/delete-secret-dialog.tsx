'use client'

import { useDashboard } from '@/features/dashboard/context'
import { defaultSuccessToast, useToast } from '@/lib/hooks/use-toast'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { RemoveIcon, TrashIcon } from '@/ui/primitives/icons'
import { useSecretsStore } from './store'
import type { Secret } from './types'

interface DeleteSecretDialogProps {
  secret: Secret
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DeleteSecretDialog = ({
  secret,
  open,
  onOpenChange,
}: DeleteSecretDialogProps) => {
  const { team } = useDashboard()
  const { toast } = useToast()
  const removeSecret = useSecretsStore((s) => s.removeSecret)

  const label = secret.label.trim() || 'Untitled'

  const handleDelete = () => {
    removeSecret(team.slug, secret.id)
    toast(defaultSuccessToast('Secret has been deleted.'))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="gap-0 px-5 py-4 pr-8 sm:max-w-[530px]"
      >
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-2">
          <DialogHeader className="min-w-0 flex-1 gap-2 text-left">
            <DialogTitle>{`delete '${label}'?`}</DialogTitle>
            <DialogDescription className="text-fg-secondary font-sans text-sm leading-5">
              Sandboxes will no longer be able to use this secret.{' '}
              <span className="text-accent-error-highlight font-medium">
                This may cause dependent flows to fail.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex shrink-0 items-center gap-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="quaternary"
                className="font-sans normal-case"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="error"
              className="gap-1 font-sans normal-case"
              onClick={handleDelete}
            >
              <TrashIcon aria-hidden className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
