'use client'

import { getDashboardLayoutConfig } from '@/configs/layout'
import { useDashboard } from '@/features/dashboard/context'
import { usePathname } from 'next/navigation'

interface DashboardLayoutFooterProps {
  statusBanner: React.ReactNode
}

export default function DashboardLayoutFooter({
  statusBanner,
}: DashboardLayoutFooterProps) {
  const { user } = useDashboard()
  const pathname = usePathname()
  const config = getDashboardLayoutConfig(pathname)

  return (
    <footer className="flex min-h-protected-footer items-center justify-between gap-2 border-t bg-bg px-3 md:px-6">
      <span className="min-w-0 flex-1 truncate pr-2 font-mono text-xs text-fg-tertiary uppercase md:pr-4 md:prose-label">
        {'>_'}
        {user.email ?? 'ANONYMOUS@UNKNOWN.COM'}
        {`:${config.title}`}
      </span>

      {statusBanner}
    </footer>
  )
}
