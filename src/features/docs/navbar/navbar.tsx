import { cn } from '@/lib/utils'
import LogoWithoutText from '@/ui/logo-without-text'
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
        'border-border bg-bg/70 z-50 h-[var(--fd-nav-height)] w-full border-b backdrop-blur-sm',
        className
      )}
    >
      <div className="flex h-full w-full items-center gap-2 px-4">
        <Link href={'/'} className="mr-auto">
          <LogoWithoutText className="size-12" />
        </Link>
        <ThemeSwitcher />
        <DocsNavLinks />
      </div>
    </nav>
  )
}
