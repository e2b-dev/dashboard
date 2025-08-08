'use client'

import { getDashboardPageConfig } from '@/configs/layout'
import { usePathname } from 'next/navigation'

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const config = getDashboardPageConfig(pathname)

  if (config?.type === 'default') {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-0 md:p-8 2xl:p-24 h-min w-full">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 max-h-[calc(100dvh-var(--protected-nav-height))] w-full max-w-full overflow-hidden">
      {children}
    </div>
  )
}
