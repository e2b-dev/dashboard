'use client'

import { cn } from '@/lib/utils/ui'
import { CloseIcon } from '@/ui/primitives/icons'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as React from 'react'

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        [
          'fixed inset-0 z-50 bg-bg/90',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'anim-ease-appear anim-duration-normal', // exit animation is faster
          'data-[state=open]:anim-duration-slow',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        ].join(' '),
        className
      )}
      {...props}
    />
  )
}

interface DialogContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content> {
  hideClose?: boolean
}

function DialogContent({
  className,
  children,
  hideClose,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          [
            'bg-bg-1 text-body text-fg-secondary',
            'fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]',
            'z-50 grid w-full max-w-[calc(100%-2rem)] sm:max-w-lg',
            'gap-3 border p-5 pt-4',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'anim-ease-appear anim-duration-normal', // exit animation is faster
            'data-[state=open]:anim-duration-slow',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          ].join(' '),
          className
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className={cn(
              [
                'absolute top-4 right-4',
                'text-icon-tertiary transition-colors hover:text-icon',
                'outline-none focus-visible:ring-1 focus-visible:ring-accent-main-highlight',
                'disabled:pointer-events-none',
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
              ].join(' ')
            )}
          >
            <CloseIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('!text-headline-small uppercase', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-fg-secondary text-body', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
