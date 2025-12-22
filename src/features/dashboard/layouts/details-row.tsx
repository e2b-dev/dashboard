import { cn } from '@/lib/utils/ui'
import { ReactNode } from 'react'

interface DetailItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
}

export function DetailsItem({ label, children, ...props }: DetailItemProps) {
  return (
    <div className={cn('flex flex-col gap-1')} {...props}>
      <span className="text-fg-tertiary prose-label uppercase">{label}</span>
      {children}
    </div>
  )
}

interface DetailsRowProps {
  children: ReactNode
}

export function DetailsRow({ children }: DetailsRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-5 md:gap-7">{children}</div>
  )
}
