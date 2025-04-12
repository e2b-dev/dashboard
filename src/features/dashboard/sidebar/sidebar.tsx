import LogoWithoutText from '@/ui/logo-without-text'
import { Suspense } from 'react'
import SidebarMenu from './menu'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import { Book, Construction, Github } from 'lucide-react'
import DeveloperSettingsDialog from '../developer-settings/settings-dialog'
import { getApiDomain } from '@/lib/utils/server'
import SidebarList from './list'
import { GITHUB_URL } from '@/configs/socials'
import ExternalIcon from '@/ui/external-icon'
import Link from 'next/link'
import Search from './search'

interface SidebarProps {
  className?: string
}

export default function Sidebar({ className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'relative flex h-full max-h-svh w-[var(--protected-sidebar-width)] min-w-[var(--protected-sidebar-width)] flex-col border-r',
        className
      )}
    >
      <header className="mb-2 flex w-full flex-col items-center justify-between border-b border-dashed">
        <div className="flex h-[var(--protected-nav-height)] w-full justify-center border-b">
          <LogoWithoutText className="size-12" />
        </div>

        <div className="w-full p-2">
          <Suspense fallback={null}>
            <SidebarMenu className="pr-2 pl-1" />
          </Suspense>
        </div>
      </header>

      <SidebarList className="flex-1 p-2 pt-0 pb-8" />

      <Suspense fallback={null}>
        <Search className="w-full" />
      </Suspense>
      <footer className="bg-bg-100 mt-auto flex flex-col">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-fg-300 hover:text-fg flex w-full items-center gap-2 border-t p-2 text-sm"
        >
          <Github className="text-fg-500 size-4" />
          GitHub
          <ExternalIcon className="ml-auto size-4" />
        </a>
        <Link
          prefetch={false}
          href="/docs"
          target="_blank"
          className="text-fg-300 hover:text-fg flex w-full items-center gap-2 border-t p-2 text-sm"
        >
          <Book className="text-fg-500 size-4" />
          Documentation
          <ExternalIcon className="ml-auto size-4" />
        </Link>
        <Suspense fallback={null}>
          <ClientComponentWrapper />
        </Suspense>
      </footer>
    </aside>
  )
}

async function ClientComponentWrapper() {
  const apiDomain = await getApiDomain()

  return (
    <>
      <DeveloperSettingsDialog apiDomain={apiDomain}>
        <Button
          variant="ghost"
          className="text-fg-300 hover:text-fg flex w-full items-center justify-start gap-2 rounded-none border-t p-2 font-sans text-sm normal-case"
        >
          <Construction className="text-fg-500 size-4" />
          Developer Settings
        </Button>
      </DeveloperSettingsDialog>
    </>
  )
}
