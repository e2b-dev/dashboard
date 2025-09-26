import { getRouteById } from '@/configs/dashboard-routes'
import { DashboardTabs } from '@/ui/dashboard-tabs'
import { notFound } from 'next/navigation'

interface SettingsLayoutProps {
  children: React.ReactNode
  general: React.ReactNode
  keys: React.ReactNode
  params: Promise<{ teamIdOrSlug: string }>
}

export default async function SettingsLayout({
  children,
  general,
  keys,
  params,
}: SettingsLayoutProps) {
  const { teamIdOrSlug } = await params
  const settingsRoute = getRouteById('settings')
  if (!settingsRoute || !settingsRoute.tabs) return notFound()

  const generateTabChild = (child: React.ReactNode, index: number) => (
    <div key={index}>
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-0 md:p-8 2xl:p-24 h-min w-full">
          {child}
        </div>
      </div>
    </div>
  )

  const tabChildren: Record<string, React.ReactNode> = {
    '@general': generateTabChild(general, 0),
    '@keys': generateTabChild(keys, 1),
  }

  return (
    <DashboardTabs
      type="query"
      tabs={settingsRoute.tabs}
      basePath={`/dashboard/${teamIdOrSlug}/settings`}
    >
      {tabChildren}
    </DashboardTabs>
  )
}
