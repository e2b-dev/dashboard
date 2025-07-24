'use client'

import { cn } from '@/lib/utils'
import { FC } from 'react'
import { Button } from './primitives/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './primitives/dialog'

interface AlertDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  title: React.ReactNode
  description: React.ReactNode
  children?: React.ReactNode
  confirm: React.ReactNode
  cancel?: React.ReactNode
  trigger?: React.ReactNode
  confirmProps?: React.ComponentPropsWithoutRef<typeof Button>
  dialogContentProps?: React.ComponentPropsWithoutRef<typeof DialogContent>
  onConfirm: () => void
}

export const AlertDialog: FC<AlertDialogProps> = ({
  title,
  description,
  children,
  confirm,
  cancel = 'Cancel',
  trigger,
  confirmProps,
  dialogContentProps,
  onConfirm,
  ...props
}) => {
  return (
    <Dialog {...props}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent {...dialogContentProps}>
        <DialogHeader className={cn(!children && 'border-b-0')}>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {children && <div className="py-4">{children}</div>}
        <DialogFooter className={cn(!children && 'border-t-0')}>
          <DialogClose asChild>
            <Button variant="outline">{cancel}</Button>
          </DialogClose>
          <Button
            variant="error"
            onClick={() => {
              onConfirm()
            }}
            {...confirmProps}
          >
            {confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
