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
      <div className="container mx-auto p-4 md:p-8 2xl:p-24 h-min w-full">
        {children}
      </div>
    )
  }

  return children
}
