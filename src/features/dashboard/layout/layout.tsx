import DashboardLayoutHeader from './header'
import DashboardLayoutWrapper from './wrapper'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="max-h-dvh flex flex-col overflow-y-auto relative">
      <DashboardLayoutHeader />
      <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
    </div>
  )
}
