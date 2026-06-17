import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/ui'

interface OverviewSectionProps {
  label: string
  labelBadge?: ReactNode
  divider?: boolean
  children: ReactNode
  className?: string
}

export function OverviewSection({
  label,
  labelBadge,
  divider = true,
  children,
  className,
}: OverviewSectionProps) {
  return (
    <section
      className={cn(
        'flex flex-col gap-4',
        divider && 'border-t border-stroke pt-8',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-fg prose-label-highlight uppercase">{label}</span>
        {labelBadge}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}
