'use client'

import { OTPInput, OTPInputContext } from 'input-otp'
import * as React from 'react'
import { cn } from '@/lib/utils'

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      'flex items-center gap-2 has-[:disabled]:opacity-50',
      containerClassName
    )}
    className={cn('disabled:cursor-not-allowed', className)}
    {...props}
  />
))
InputOTP.displayName = 'InputOTP'

const InputOTPGroup = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-2', className)}
    {...props}
  />
))
InputOTPGroup.displayName = 'InputOTPGroup'

const InputOTPSlot = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'> & { index: number }
>(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, isActive } = inputOTPContext.slots[index] ?? {}

  // Mirrors src/ui/primitives/input.tsx: square border, bg-bg, accent focus.
  return (
    <div
      ref={ref}
      className={cn(
        'bg-bg relative flex h-9 w-full items-center justify-center border',
        'prose-body transition-colors',
        isActive && 'border-accent-main-highlight z-10',
        className
      )}
      {...props}
    >
      {char}
    </div>
  )
})
InputOTPSlot.displayName = 'InputOTPSlot'

export { InputOTP, InputOTPGroup, InputOTPSlot }
