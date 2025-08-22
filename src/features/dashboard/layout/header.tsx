'use client'

import { getDashboardPageConfig } from '@/configs/layout'
import { cn } from '@/lib/utils/ui'
import ClientOnly from '@/ui/client-only'
import { SidebarTrigger } from '@/ui/primitives/sidebar'
import { ThemeSwitcher } from '@/ui/theme-switcher'
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
        'sticky top-0 z-50 bg-bg/40 backdrop-blur-md min-h-13 flex items-center md:items-end gap-2',
        {
          'border-b p-3 md:p-6': config?.type === 'default',
          'pb-0 px-3 md:px-6': config?.type === 'custom',
        },
        className
      )}
    >
      <SidebarTrigger className="w-7 h-7 md:hidden" />
      <h1 className="mr-auto">{config?.title}</h1>
      <ClientOnly>
        <ThemeSwitcher />
      </ClientOnly>
    </div>
  )
}
