'use client'

import { Button } from '@/ui/primitives/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/ui/primitives/dialog'
import { TrashIcon } from '@/ui/primitives/icons'

interface RemovePhotoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isRemoving: boolean
}

export const RemovePhotoDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isRemoving,
}: RemovePhotoDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      hideClose
      className="max-w-[calc(100%-2rem)] gap-0 border p-0 sm:max-w-[500px]"
    >
      <div className="flex items-center justify-between gap-6 p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <DialogTitle className="text-left">Remove profile photo?</DialogTitle>
          <DialogDescription className="text-left text-sm leading-5 text-fg-secondary">
            It will be replaced by a default one
          </DialogDescription>
        </div>
        <div className="flex shrink-0 items-center gap-4 self-center">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer text-sm leading-5 font-medium text-fg-tertiary"
            disabled={isRemoving}
          >
            Cancel
          </button>
          <Button
            type="button"
            variant="error"
            onClick={onConfirm}
            loading={isRemoving}
            disabled={isRemoving}
          >
            <TrashIcon className="size-4 shrink-0" />
            Remove
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
)
