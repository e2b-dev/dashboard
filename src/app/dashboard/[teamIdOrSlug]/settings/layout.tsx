import { DashboardTab, DashboardTabs } from '@/ui/dashboard-tabs'
import { KeyIcon, SettingsIcon } from '@/ui/primitives/icons'

interface SettingsLayoutProps {
  general: React.ReactNode
  keys: React.ReactNode
}

export default async function SettingsLayout({
  general,
  keys,
}: SettingsLayoutProps) {
  return (
    <DashboardTabs
      type="query"
      layoutKey="tabs-indicator-settings"
      className="mt-2 md:mt-3"
    >
      <DashboardTab
        id="general"
        label="General"
        icon={<SettingsIcon className="size-5" />}
      >
        <div className="flex-1 overflow-y-auto h-full min-h-0">
          <div className="container mx-auto p-0 md:p-8 2xl:p-24 h-min w-full">
            {general}
          </div>
        </div>
      </DashboardTab>
      <DashboardTab
        id="keys"
        label="Keys"
        icon={<KeyIcon className="size-5" />}
      >
        <div className="flex-1 overflow-y-auto h-full min-h-0">
          <div className="container mx-auto p-0 md:p-8 2xl:p-24 h-min w-full">
            {keys}
          </div>
        </div>
      </DashboardTab>
    </DashboardTabs>
  )
}
