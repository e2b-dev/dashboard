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
        {/* <LiveSandboxCounterServer
          className="top-1/2 -translate-y-1/2 absolute right-10 max-md:hidden"
          params={params}
        /> */}
      </DashboardLayoutHeader>
      <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
    </div>
  )
}
