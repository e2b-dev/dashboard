'use client'

import { getDashboardLayoutConfig } from '@/configs/layout'
import { CatchErrorBoundary } from '@/ui/error'
import { usePathname } from 'next/navigation'

export function DefaultDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container mx-auto p-0 md:p-8 2xl:p-24 h-min w-full">
        <CatchErrorBoundary
          classNames={{
            wrapper: 'h-full w-full',
            errorBoundary: 'h-full w-full',
          }}
        >
          {children}
        </CatchErrorBoundary>
      </div>
    </div>
  )
}

export function CustomDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 min-h-0 max-h-dvh w-full max-w-full overflow-y-auto md:overflow-hidden">
      <CatchErrorBoundary
        classNames={{
          wrapper: 'h-full w-full',
          errorBoundary: 'h-full w-full',
        }}
      >
        {children}
      </CatchErrorBoundary>
    </div>
  )
}

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const config = getDashboardLayoutConfig(pathname)

  if (config.type === 'default') {
    return <DefaultDashboardLayout>{children}</DefaultDashboardLayout>
  }

  return <CustomDashboardLayout>{children}</CustomDashboardLayout>
}
