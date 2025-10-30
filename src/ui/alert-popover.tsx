'use client'

import { FC } from 'react'
import { Button } from './primitives/button'
import { Popover, PopoverContent, PopoverTrigger } from './primitives/popover'

interface AlertPopoverProps
  extends React.ComponentPropsWithoutRef<typeof Popover> {
  title: React.ReactNode
  description: React.ReactNode
  children?: React.ReactNode
  confirm: React.ReactNode
  cancel?: React.ReactNode
  trigger?: React.ReactNode
  confirmProps?: React.ComponentPropsWithoutRef<typeof Button>
  popoverContentProps?: React.ComponentPropsWithoutRef<typeof PopoverContent>
  onConfirm: () => void
  onCancel: () => void
}

export const AlertPopover: FC<AlertPopoverProps> = ({
  title,
  description,
  children,
  confirm,
  cancel = 'Cancel',
  trigger,
  confirmProps,
  popoverContentProps,
  onConfirm,
  onCancel,
  ...props
}) => {
  return (
    <Popover {...props}>
      {trigger && <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
      <PopoverContent side="bottom" align="center" {...popoverContentProps}>
        <div className="space-y-4 p-4">
          <div className="space-y-1">
            <h4 className="">{title}</h4>
            <p className="prose-body text-fg-tertiary">{description}</p>
          </div>

          {children && <div>{children}</div>}

          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onCancel}>
              {cancel}
            </Button>
            <Button
              variant="error"
              size="sm"
              onClick={onConfirm}
              {...confirmProps}
            >
              {confirm}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
