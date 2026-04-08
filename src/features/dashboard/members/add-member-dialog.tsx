'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { AddMemberEmailForm } from '@/features/dashboard/members/add-member-form'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'

export const AddMemberDialog = () => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="normal-case font-sans"
          size="md"
          type="button"
          variant="default"
        >
          <Plus aria-hidden className="size-4 shrink-0" />
          Add new member
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-2" hideClose>
        <DialogHeader>
          <DialogTitle>Add new member</DialogTitle>
        </DialogHeader>
        <AddMemberEmailForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
