import { useClipboard } from '@/lib/hooks/use-clipboard'
import { cn } from '@/lib/utils/ui'
import { useRef, useState } from 'react'

export default function CopyButtonInline({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const [wasCopied, copy] = useClipboard()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [capturedWidth, setCapturedWidth] = useState<number | null>(null)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (buttonRef.current && !wasCopied) {
      setCapturedWidth(buttonRef.current.offsetWidth)
    }
    copy(value)
  }

  return (
    <span
      ref={buttonRef}
      onClick={handleClick}
      style={
        wasCopied && capturedWidth ? { minWidth: capturedWidth } : undefined
      }
      className={cn(
        'block transition-colors cursor-copy',
        'hover:text-accent-main-highlight',
        className,
        wasCopied && 'text-accent-main-highlight font-sans!'
      )}
    >
      {wasCopied ? 'Copied!' : children}
    </span>
  )
}
