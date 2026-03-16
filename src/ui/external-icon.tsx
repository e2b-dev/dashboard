import { cn } from '@/lib/utils'
import { ChevronRightIcon } from './primitives/icons'

interface ExternalIconProps {
  className?: string
}

export default function ExternalIcon({ className }: ExternalIconProps) {
  return (
    <ChevronRightIcon
      className={cn(
        'text-accent-main-highlight size-4 -translate-y-1 -rotate-45',
        className
      )}
    />
  )
}
