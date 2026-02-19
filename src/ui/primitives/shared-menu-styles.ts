import { cn } from '@/lib/utils'
import { cardVariants } from '@/ui/primitives/card'
import { cva } from 'class-variance-authority'

export const menuItemVariants = cva(
  [
    'relative prose-body flex cursor-pointer select-none items-center gap-2',
    'px-2 py-1.5',
    'outline-none',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  ],
  {
    variants: {
      variant: {
        default: 'focus:bg-bg-highlight',
        error:
          'text-accent-error-highlight focus:bg-accent-error-bg focus:text-accent-error-highlight',
        success:
          'text-accent-positive-highlight focus:bg-accent-positive-bg focus:text-accent-positive-highlight',
        warning:
          'text-accent-warning-highlight focus:bg-accent-warning-bg focus:text-accent-warning-highlight',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export const menuContentStyles = cn(
  'z-50 min-w-[8rem] overflow-hidden  p-2',
  cardVariants({ variant: 'layer' }),
  'shadow-sm',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
  'data-[side=bottom]:slide-in-from-top-2',
  'data-[side=left]:slide-in-from-right-2',
  'data-[side=right]:slide-in-from-left-2',
  'data-[side=top]:slide-in-from-bottom-2'
)

export const menuLabelStyles = cn(
  'font-mono text-xs uppercase',
  'text-fg-tertiary'
)

export const menuSeparatorStyles = cn('-mx-2 my-2', 'border-t')

export const menuViewportStyles = cn('p-1')

export const menuGroupStyles = cn('flex flex-col gap-0.5 pt-2 first:pt-0')
