import { cn } from '@/lib/utils'
import { E2BLogo } from '@/ui/brand'
import { ThemeSwitcher } from '@/ui/theme-switcher'
import Link from 'next/link'
import DocsNavLinks from './links'

interface NavProps {
  className?: string
}

export function Nav({ className }: NavProps) {
  return (
    <nav
      className={cn(
        'border-stroke bg-bg/70 z-50 h-[var(--fd-nav-height)] w-full border-b backdrop-blur-sm',
        className
      )}
    >
      <div className="flex h-full w-full items-center gap-2 px-4">
        <Link href={'/'} className="mr-auto">
          <E2BLogo className="size-6" />
        </Link>
        <ThemeSwitcher />
        <DocsNavLinks />
      </div>
    </nav>
  )
}
