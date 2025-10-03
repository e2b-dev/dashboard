'use client'

import { getDashboardLayoutConfig } from '@/configs/layout'
import { cn } from '@/lib/utils'
import ClientOnly from '@/ui/client-only'
import { SidebarTrigger } from '@/ui/primitives/sidebar'
import { ThemeSwitcher } from '@/ui/theme-switcher'
import { usePathname } from 'next/navigation'

interface DashboardLayoutHeaderProps {
  className?: string
  headerInjectable?: React.ReactNode
}

export default function DashboardLayoutHeader({
  className,
  headerInjectable,
}: DashboardLayoutHeaderProps) {
  const pathname = usePathname()
  const config = getDashboardLayoutConfig(pathname)

  return (
    <div
      className={cn(
        'sticky top-0 z-50 bg-bg/40 backdrop-blur-md p-3 md:p-6 flex items-end gap-2',
        {
          'border-b min-h-[var(--height-protected-nav)+12px] md:min-h-[var(--height-protected-nav)+24px] max-h-min':
            config.type === 'default',
          '!pb-0 min-h-protected-nav max-h-min': config.type === 'custom',
        },
        className
      )}
    >
      <div className="flex items-center gap-2 w-full relative">
        <SidebarTrigger className="w-7 h-7 md:hidden -translate-x-1" />

        <h1 className="mr-auto align-middle">{config.title}</h1>

        {/* custom content if provided via parallel route */}
        {headerInjectable && <>{headerInjectable}</>}

        <ClientOnly>
          <ThemeSwitcher />
        </ClientOnly>
      </div>
    </div>
  )
}
