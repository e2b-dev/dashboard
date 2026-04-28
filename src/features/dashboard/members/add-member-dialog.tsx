'use client'

import { useState } from 'react'
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

export const AddMemberDialog = () => {
  const [open, setOpen] = useState(false)

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
