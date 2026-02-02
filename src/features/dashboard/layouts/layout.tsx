import { LiveSandboxCounterServer } from '../sandboxes/live-counter.server'
import DashboardLayoutHeader from './header'
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
        <LiveSandboxCounterServer className="max-md:hidden" params={params} />
      </DashboardLayoutHeader>
      <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
    </div>
  )
}
