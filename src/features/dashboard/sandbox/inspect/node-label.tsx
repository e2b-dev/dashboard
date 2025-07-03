import { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

interface NodeLabelProps {
  name: string
  isActive?: boolean
  isLoading?: boolean
  className?: string
}

export default function NodeLabel({
  name,
  isActive = false,
  isLoading = false,
  className,
}: NodeLabelProps) {
  return (
    <span
      style={
        {
          '--shiny-width': '50px',
          backgroundImage:
            isLoading &&
            'linear-gradient(to right, transparent, var(--fg) 40%, var(--fg) 60%, transparent)',
        } as CSSProperties
      }
      className={cn(
        'text-fg-300 truncate text-left font-sans text-sm transition-colors',
        {
          'text-fg': isActive && !isLoading,
          'text-fg/60 animate-shiny-text [background-size:var(--shiny-width)_100%] bg-clip-text [background-position:calc(-100%_-_var(--shiny-width))_0] bg-no-repeat':
            isLoading,
        },
        className
      )}
    >
      {name}
    </span>
  )
}
