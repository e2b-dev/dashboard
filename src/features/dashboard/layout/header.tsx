'use client'

import { getDashboardPageConfig } from '@/configs/layout'
import { cn } from '@/lib/utils/ui'
import { usePathname } from 'next/navigation'

interface DashboardLayoutHeaderProps {
  className?: string
}

export default function DashboardLayoutHeader({
  className,
}: DashboardLayoutHeaderProps) {
  const pathname = usePathname()
  const config = getDashboardPageConfig(pathname)

  return (
    <div
      className={cn(
        'sticky top-0 z-50 bg-bg/40 backdrop-blur-md p-6',
        {
          'border-b': config?.type === 'default',
          'pb-0': config?.type === 'custom',
        },
        className
      )}
    >
      <h1 className="mr-auto">{config?.title}</h1>
    </div>
  )
}
