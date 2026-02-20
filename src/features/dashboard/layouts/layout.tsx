import { INCLUDE_STATUS_INDICATOR } from '@/configs/flags'
import { LiveSandboxCounterServer } from '../sandboxes/live-counter.server'
import DashboardLayoutFooter from './footer'
import DashboardLayoutHeader from './header'
import DashboardStatusBadgeServer from './status-indicator.server'
import DashboardLayoutWrapper from './wrapper'

interface DashboardLayoutProps {
  children: React.ReactNode
  params: Promise<{ teamIdOrSlug: string }>
}

export default function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  return (
    <div className="max-h-dvh h-full relative flex flex-col min-h-0">
      <DashboardLayoutHeader>
        <LiveSandboxCounterServer
          className="max-md:hidden"
          params={params}
        />
      </DashboardLayoutHeader>
      <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
      <DashboardLayoutFooter
        statusBanner={
          INCLUDE_STATUS_INDICATOR ? <DashboardStatusBadgeServer /> : null
        }
      />
    </div>
  )
}
