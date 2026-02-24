'use client'

import { getDashboardLayoutConfig, TitleSegment } from '@/configs/layout'
import { cn } from '@/lib/utils'
import ClientOnly from '@/ui/client-only'
import { SidebarTrigger } from '@/ui/primitives/sidebar'
import { ThemeSwitcher } from '@/ui/theme-switcher'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'

interface DashboardLayoutHeaderProps {
  className?: string
  children?: React.ReactNode
}

export default function DashboardLayoutHeader({
  className,
  children,
}: DashboardLayoutHeaderProps) {
  const pathname = usePathname()
  const config = getDashboardLayoutConfig(pathname)

  return (
    <div
      className={cn(
        'sticky top-0 z-50 bg-bg/40 backdrop-blur-md p-3 md:p-6 flex items-end gap-2',
        {
          'border-b min-h-[var(--height-protected-navbar)+12px] md:min-h-[var(--height-protected-navbar)+24px] max-h-min':
            config.type === 'default',
          '!pb-0 min-h-protected-navbar max-h-min': config.type === 'custom',
          'border-b !pb-3 md:!pb-6':
            config.custom?.includeHeaderBottomStyles &&
            config.type === 'custom',
        },
        className
      )}
    >
      <div className="flex items-center w-full relative min-h-6 gap-2">
        <SidebarTrigger className="w-7 h-7 md:hidden -translate-x-1 shrink-0" />

        <h1 className="truncate min-w-0 flex-1">
          <HeaderTitle title={config.title} />
        </h1>

        {/* Ghost element - reserves width but not height */}
        <div className="h-0 overflow-visible shrink-0 flex items-center">
          {children}
        </div>

        <ClientOnly className="flex items-center pl-2">
          <ThemeSwitcher />
        </ClientOnly>
      </div>
    </div>
  )
}

function HeaderTitle({ title }: { title: string | TitleSegment[] }) {
  if (typeof title === 'string') {
    return title
  }

  return (
    <span className="flex items-center gap-1">
      {title.map((segment, index) => (
        <Fragment key={index}>
          {index > 0 && <span className="text-fg-tertiary select-none shrink-0">/</span>}
          {segment.href ? (
            <Link
              href={segment.href}
              className="text-fg-secondary hover:text-fg transition-colors hover:underline shrink-0"
            >
              {segment.label}
            </Link>
          ) : (
            <span className="truncate">{segment.label}</span>
          )}
        </Fragment>
      ))}
    </span>
  )
}
