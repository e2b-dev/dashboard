'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { cn, EASE_APPEAR } from '@/lib/utils/ui'
import { CheckmarkIcon, CopyIcon } from '@/ui/primitives/icons'

export default function CopyButtonInline({
  value,
  children,
  className,
  iconPosition = 'right',
  truncate = true,
  'aria-label': ariaLabel,
}: {
  value: string
  children: React.ReactNode
  className?: string
  iconPosition?: 'left' | 'right'
  truncate?: boolean
  'aria-label'?: string
}) {
  const [wasCopied, copy] = useClipboard(1000)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    copy(value)
  }

  const icon = (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center transition-opacity [&_svg]:size-3.5',
        wasCopied
          ? 'opacity-100 [&_svg]:text-icon'
          : 'opacity-0 [&_svg]:text-icon-secondary group-hover/copy:opacity-100 group-focus-visible/copy:opacity-100'
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {wasCopied ? (
          <motion.span
            key="check"
            initial={{ opacity: 0.2, scale: 0.97, filter: 'blur(1px)' }}
            animate={{ opacity: 1, scale: 1.2, filter: 'blur(0px)' }}
            exit={{ opacity: 0.2, scale: 0.97, filter: 'blur(1px)' }}
            transition={{ duration: 0.1, ease: EASE_APPEAR }}
          >
            <CheckmarkIcon />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0.2, scale: 0.9, filter: 'blur(1px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0.2, scale: 0.9, filter: 'blur(1px)' }}
            transition={{ duration: 0.1, ease: EASE_APPEAR }}
          >
            <CopyIcon />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className={cn(
        'group/copy inline-flex min-w-0 cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-left hover:opacity-80',
        className
      )}
    >
      {iconPosition === 'left' && icon}
      <span className={truncate ? 'truncate' : 'whitespace-nowrap'}>
        {children}
      </span>
      {iconPosition === 'right' && icon}
    </button>
  )
}
