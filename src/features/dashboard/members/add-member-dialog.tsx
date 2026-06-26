'use client'

import { useState } from 'react'
import { useDashboard } from '@/features/dashboard/context'
import { AddMemberForm } from '@/features/dashboard/members/add-member-form'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import { AddIcon } from '@/ui/primitives/icons'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/ui/primitives/tooltip'

export const AddMemberDialog = () => {
  const { user } = useDashboard()
  const [open, setOpen] = useState(false)

  if (user.isSso) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* A disabled button swallows the pointer events the tooltip trigger
              needs, so the wrapping span carries them instead. */}
          <span>
            <Button type="button" disabled>
              <AddIcon />
              Add new member
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px]">
          Members are managed by your SSO provider. Ask teammates to sign in
          through SSO to join this team automatically.
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <AddIcon />
          Add new member
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-2" hideClose>
        <DialogHeader>
          <DialogTitle>Add new member</DialogTitle>
        </DialogHeader>
        <AddMemberForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
