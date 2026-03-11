import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MonitoringChartSectionProps {
  children: ReactNode
  className?: string
  header?: ReactNode
}

export default function MonitoringChartSection({
  children,
  className,
  header,
}: MonitoringChartSectionProps) {
  return (
    <section className={cn('flex min-h-0 flex-col overflow-hidden', className)}>
      <div className="p-3 md:px-6 border-b">{header}</div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}
