import DashboardLayoutHeader from './header'
import DashboardLayoutWrapper from './wrapper'

interface DashboardLayoutProps {
  children: React.ReactNode
  teamIdOrSlug?: string
  headerInjectable?: React.ReactNode
}

export default function DashboardLayout({
  children,
  teamIdOrSlug,
  headerInjectable,
}: DashboardLayoutProps) {
  return (
    <div className="max-h-dvh h-full relative flex flex-col min-h-0">
      <DashboardLayoutHeader
        teamIdOrSlug={teamIdOrSlug}
        headerInjectable={headerInjectable}
      />
      <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
    </div>
  )
}
