'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { DashboardTabsList } from '@/ui/dashboard-tabs'
import { ListIcon, TrendIcon } from '@/ui/primitives/icons'
import { WebhookDetailHeader } from './header'

type WebhookDetailLayoutProps = {
  children: React.ReactNode
  teamSlug: string
  webhookId: string
}

export const WebhookDetailLayout = ({
  children,
  teamSlug,
  webhookId,
}: WebhookDetailLayoutProps) => (
  <div className="flex h-full min-h-0 flex-1 flex-col max-md:overflow-y-auto">
    <WebhookDetailHeader teamSlug={teamSlug} webhookId={webhookId} />
    <DashboardTabsList
      layoutKey="tabs-indicator-webhook"
      className="max-md:sticky max-md:top-0 max-md:z-20"
      tabs={[
        {
          id: 'overview',
          label: 'Overview',
          href: PROTECTED_URLS.WEBHOOK_OVERVIEW(teamSlug, webhookId),
          icon: <TrendIcon className="size-4" />,
        },
        {
          id: 'deliveries',
          label: 'Events',
          href: PROTECTED_URLS.WEBHOOK_DELIVERIES(teamSlug, webhookId),
          icon: <ListIcon className="size-4" />,
        },
      ]}
    />
    {children}
  </div>
)
