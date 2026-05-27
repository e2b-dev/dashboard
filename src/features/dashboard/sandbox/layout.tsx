'use client'

import { notFound } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { DashboardTabsList } from '@/ui/dashboard-tabs'
import {
  HistoryIcon,
  ListIcon,
  StorageIcon,
  TrendIcon,
} from '@/ui/primitives/icons'
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
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex h-full w-full min-h-0 flex-col max-md:overflow-y-auto md:flex-1">
        <div className="max-md:shrink-0">{header}</div>

        <div className="flex flex-col max-md:h-full max-md:shrink-0 md:min-h-0 md:flex-1">
          <DashboardTabsList
            layoutKey="tabs-indicator-sandbox"
            className="bg-bg z-20 max-md:sticky max-md:top-0"
            mobileVariant="select"
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

          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </div>
  )
}
