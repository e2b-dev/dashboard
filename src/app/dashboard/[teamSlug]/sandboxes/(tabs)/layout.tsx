import { PROTECTED_URLS } from '@/configs/urls'
import { DashboardTabsList } from '@/ui/dashboard-tabs'
import { ListIcon, TrendIcon } from '@/ui/primitives/icons'

export default async function SandboxesTabsLayout({
  children,
  params,
}: LayoutProps<'/dashboard/[teamSlug]/sandboxes'>) {
  const { teamSlug } = await params

  return (
    <div className="mt-2 md:mt-3 min-h-0 h-full flex flex-col">
      <DashboardTabsList
        layoutKey="tabs-indicator-sandboxes"
        tabs={[
          {
            id: 'monitoring',
            label: 'Monitoring',
            href: PROTECTED_URLS.SANDBOXES_MONITORING(teamSlug),
            icon: <TrendIcon className="size-4" />,
          },
          {
            id: 'list',
            label: 'List',
            href: PROTECTED_URLS.SANDBOXES_LIST(teamSlug),
            icon: <ListIcon className="size-4" />,
          },
        ]}
      />
      {children}
    </div>
  )
}
