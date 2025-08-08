import DashboardLayoutHeader from './header'
import DashboardLayoutWrapper from './wrapper'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="max-h-dvh h-full relative flex flex-col min-h-0">
      <DashboardLayoutHeader />
      <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
    </div>
  )
}
