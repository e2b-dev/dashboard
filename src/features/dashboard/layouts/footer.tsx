'use client'

import { useDashboard } from '@/features/dashboard/context'

interface DashboardLayoutFooterProps {
  statusBanner: React.ReactNode
}

export default function DashboardLayoutFooter({
  statusBanner,
}: DashboardLayoutFooterProps) {
  const { user } = useDashboard()

  return (
    <footer className="hidden h-protected-footer min-h-protected-footer items-center justify-between border-t bg-bg px-6 md:flex">
      <span className="prose-label text-fg-tertiary font-mono uppercase truncate pr-4">
        {user.email ?? 'No email'}
      </span>

      {statusBanner}
    </footer>
  )
}
