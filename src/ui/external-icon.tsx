import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

interface ExternalIconProps {
  className?: string
}

export default function ExternalIcon({ className }: ExternalIconProps) {
  return (
    <ChevronRight
      className={cn(
        'text-accent-main-highlight size-4 -translate-y-1 -rotate-45',
        className
      )}
    />
  )
}
