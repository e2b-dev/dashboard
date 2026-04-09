'use client'

import type { ReactNode } from 'react'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import { TrashIcon } from '@/ui/primitives/icons'

interface RemoveMemberDialogProps {
  isRemoving: boolean
  memberEmail: string
  memberName?: string
  onRemove: () => void
  open: boolean
  setOpen: (v: boolean) => void
  teamName?: string | null
  trigger: ReactNode
}

export const RemoveMemberDialog = ({
  isRemoving,
  memberEmail,
  memberName,
  onRemove,
  open,
  setOpen,
  teamName,
  trigger,
}: RemoveMemberDialogProps) => {
  const shortMemberName = memberName?.trim().split(/\s+/)[0] || memberEmail
  const fullMemberName = memberName ?? memberEmail
  const teamLabel = teamName || 'this team'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent hideClose>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <DialogHeader className="min-w-0 flex-1 gap-2 text-left">
            <DialogTitle>Remove {shortMemberName}?</DialogTitle>
            <DialogDescription className="prose-body">
              {fullMemberName} will be removed from {teamLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="flex shrink-0 items-center justify-end gap-5">
            <DialogClose asChild>
              <Button
                className="font-sans normal-case text-fg-tertiary hover:text-fg-tertiary focus:text-fg-tertiary"
                disabled={isRemoving}
                size="slate"
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              className="font-sans normal-case"
              loading={isRemoving}
              onClick={onRemove}
              size="md"
              type="button"
              variant="error"
            >
              <TrashIcon className="size-4" />
              Remove
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
