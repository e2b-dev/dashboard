'use client'

import { notFound } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { DashboardTabsList } from '@/ui/dashboard-tabs'
import { HistoryIcon, ListIcon, StorageIcon, TrendIcon } from '@/ui/primitives/icons'
import { useSandboxContext } from './context'

interface SandboxLayoutProps {
  children: React.ReactNode
  header: React.ReactNode
  tabsHeaderAccessory?: React.ReactNode
}

export default function SandboxLayout({
  children,
  header,
  tabsHeaderAccessory,
}: SandboxLayoutProps) {
  const { teamSlug, sandboxId } =
    useRouteParams<'/dashboard/[teamSlug]/sandboxes/[sandboxId]'>()

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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col max-md:overflow-y-auto">
      {header}

      <DashboardTabsList
        layoutKey="tabs-indicator-sandbox"
        className="max-md:sticky max-md:top-0 max-md:z-20"
        headerAccessory={tabsHeaderAccessory}
        tabs={[
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
        ]}
      />
      {children}
    </div>
  )
}
