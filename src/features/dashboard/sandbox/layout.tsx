'use client'

import { notFound, usePathname, useRouter } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { HoverPrefetchLink } from '@/ui/hover-prefetch-link'
import {
  HistoryIcon,
  ListIcon,
  StorageIcon,
  TrendIcon,
} from '@/ui/primitives/icons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/ui/primitives/select'
import { Tabs, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { useSandboxContext } from './context'

interface SandboxLayoutProps {
  children: React.ReactNode
  header: React.ReactNode
  tabsHeaderAccessory?: React.ReactNode
}

const TABS_LAYOUT_KEY = 'tabs-indicator-sandbox'

interface SandboxTab {
  id: string
  label: string
  href: string
  icon: React.ReactNode
}

function isTabActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function SandboxLayout({
  children,
  header,
  tabsHeaderAccessory,
}: SandboxLayoutProps) {
  const { teamSlug, sandboxId } =
    useRouteParams<'/dashboard/[teamSlug]/sandboxes/[sandboxId]'>()
  const pathname = usePathname()
  const router = useRouter()
  const { sandboxInfo, isSandboxInfoLoading, isSandboxNotFound } =
    useSandboxContext()

  if (isSandboxNotFound) {
    throw notFound()
  }

  if (!sandboxInfo) {
    if (!isSandboxInfoLoading) {
      throw notFound()
    }
  }

  const tabs: SandboxTab[] = [
    {
      id: 'monitoring',
      label: 'Monitoring',
      href: PROTECTED_URLS.SANDBOX_MONITORING(teamSlug, sandboxId),
      icon: <TrendIcon className="size-4" />,
    },
    {
      id: 'events',
      label: 'Events',
      href: PROTECTED_URLS.SANDBOX_EVENTS(teamSlug, sandboxId),
      icon: <HistoryIcon className="size-4" />,
    },
    {
      id: 'logs',
      label: 'Logs',
      href: PROTECTED_URLS.SANDBOX_LOGS(teamSlug, sandboxId),
      icon: <ListIcon className="size-4" />,
    },
    {
      id: 'filesystem',
      label: 'Filesystem',
      href: PROTECTED_URLS.SANDBOX_FILESYSTEM(teamSlug, sandboxId),
      icon: <StorageIcon className="size-4" />,
    },
  ]

  const firstTab = tabs[0]!
  const activeTab =
    tabs.find((tab) => isTabActive(pathname, tab.href)) ?? firstTab
  const activeTabId = activeTab.id

  const tabTriggers = tabs.map((tab) => (
    <TabsTrigger
      key={tab.id}
      layoutkey={TABS_LAYOUT_KEY}
      value={tab.id}
      className="w-fit flex-none"
      asChild
    >
      <HoverPrefetchLink href={tab.href}>
        {tab.icon}
        {tab.label}
      </HoverPrefetchLink>
    </TabsTrigger>
  ))

  const handleTabSelect = (id: string) => {
    const tab = tabs.find((t) => t.id === id)
    if (tab) router.push(tab.href)
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Tabs
        value={activeTabId}
        className="flex h-full w-full min-h-0 flex-col max-md:overflow-y-auto md:flex-1"
      >
        <div className="max-md:shrink-0">{header}</div>

        <div className="flex flex-col max-md:h-full max-md:shrink-0 md:min-h-0 md:flex-1">
          <div className="bg-bg z-20 flex w-full flex-row items-end max-md:sticky max-md:top-0">
            <Select value={activeTabId} onValueChange={handleTabSelect}>
              <SelectTrigger className="h-9 w-fit border-x-0 border-t-0 border-b border-solid md:hidden">
                <div className="flex items-center gap-2">
                  {activeTab.icon}
                  {activeTab.label}
                </div>
              </SelectTrigger>
              <SelectContent>
                {tabs.map((tab) => (
                  <SelectItem key={tab.id} value={tab.id}>
                    <div className="flex items-center gap-2">
                      {tab.icon}
                      {tab.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <TabsList className="bg-bg justify-start max-md:hidden md:flex-1">
              {tabTriggers}
            </TabsList>

            {tabsHeaderAccessory && (
              <div className="flex items-end border-b border-solid max-md:flex-1 max-md:justify-end md:px-6">
                {tabsHeaderAccessory}
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </Tabs>
    </div>
  )
}
