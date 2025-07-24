'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as React from 'react'

import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) => (
  <DialogPrimitive.Overlay
    data-slot="dialog-overlay"
    className={cn(
      'fixed inset-0 z-50 bg-black/20 backdrop-blur-[4px]',
      className
    )}
    {...props}
  />
)
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  hideCloseButton?: boolean
}) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      data-slot="dialog-content"
      className={cn(
        'fixed top-[50%] left-[50%] z-50 rounded-sm border',
        'w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
        'bg-bg p-6',
        'text-fg outline-none',
        'animate-fade-slide-in',
        className
      )}
      {...props}
    >
      {children}
      {!props.hideCloseButton && (
        <DialogPrimitive.Close className="absolute top-4 right-4 opacity-70 transition-opacity hover:opacity-100">
          <span className="text-fg-300 font-mono">[×]</span>
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
)
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="dialog-header"
    className={cn(
      'border-fg-300/20 flex flex-col space-y-1 border-b border-dashed pb-4',
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="dialog-footer"
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4',
      'border-fg-300/20 mt-4 border-t border-dashed pt-4',
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title
    data-slot="dialog-title"
    className={cn(
      'font-mono text-lg font-semibold tracking-wider uppercase',
      'flex items-center gap-2',
      className
    )}
    {...props}
  >
    {props.children}
  </DialogPrimitive.Title>
)
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description
    data-slot="dialog-description"
    className={cn('text-fg-500 text-sm', className)}
    {...props}
  />
)
DialogDescription.displayName = DialogPrimitive.Description.displayName

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
