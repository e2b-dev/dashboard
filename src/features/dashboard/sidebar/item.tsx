'use client'

import { cn } from '@/lib/utils'
import Dotted from '@/ui/dotted'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarItemProps {
  label: React.ReactNode
  href: string
  icon: React.ReactNode
}

export function SidebarItem({ label, href, icon }: SidebarItemProps) {
  const pathname = usePathname()

  return (
    <Link
      prefetch
      href={href}
      suppressHydrationWarning
      className={cn(
        'group/item ring-border relative w-full overflow-hidden transition-all duration-150 hover:no-underline hover:ring-1'
      )}
    >
      <Dotted className="z-0" />
      <div
        className={cn(
          'bg-bg ring-border relative z-10 transition-all duration-150',
          'group-hover/item:-translate-y-[4px] group-hover/item:scale-[1.005] group-hover/item:shadow-sm group-hover/item:ring-1 dark:group-hover/item:shadow-md'
        )}
      >
        <div className="bg-bg flex w-full items-center font-mono text-sm">
          <div
            className={cn(
              'flex w-full items-center gap-1 px-2 py-1',
              pathname === href ? 'text-accent' : 'text-fg-300 hover:text-fg'
            )}
          >
            {icon}
            <span className="shrink-0">{label}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
