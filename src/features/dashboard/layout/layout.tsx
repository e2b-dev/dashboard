import DashboardLayoutHeader from './header'
import DashboardLayoutWrapper from './wrapper'

interface DashboardLayoutProps {
  children: React.ReactNode
  headerInjectable?: React.ReactNode
}

export default function DashboardLayout({
  children,
  headerInjectable,
}: DashboardLayoutProps) {
  return (
    <div className="max-h-dvh h-full relative flex flex-col min-h-0">
      <DashboardLayoutHeader headerInjectable={headerInjectable} />
      <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
    </div>
  )
}
