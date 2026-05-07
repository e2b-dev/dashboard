'use client'

import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { CloseIcon } from '@/ui/primitives/icons'

type DiscardWebhookChangesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
}

export const DiscardWebhookChangesDialog = ({
  open,
  onOpenChange,
  onDiscard,
}: DiscardWebhookChangesDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      hideClose
      className="flex flex-row items-center gap-6 sm:max-w-[516px] py-4 pr-8 pl-5"
    >
      <DialogHeader className="flex-1 gap-2 text-left">
        <DialogTitle>Discard changes?</DialogTitle>
        <DialogDescription>
          You have unsaved changes. If you leave now, they&apos;ll be lost.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="shrink-0 gap-5 sm:gap-5">
        <Button variant="quaternary" onClick={() => onOpenChange(false)}>
          Stay
        </Button>
        <Button variant="primary" onClick={onDiscard}>
          <CloseIcon className="size-4" />
          Discard
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
