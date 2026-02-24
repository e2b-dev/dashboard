import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

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
      {header ? header : null}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}
