'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getDashboardLayoutConfig } from '@/configs/layout'
import { PROTECTED_URLS } from '@/configs/urls'
import { useDashboard } from '@/features/dashboard/context'
import { BlockIcon } from '@/ui/primitives/icons'

interface DashboardLayoutFooterProps {
  statusBanner: React.ReactNode
}

export default function DashboardLayoutFooter({
  statusBanner,
}: DashboardLayoutFooterProps) {
  const { team, user } = useDashboard()
  const pathname = usePathname()
  const config = getDashboardLayoutConfig(pathname)
  const footerTitle =
    typeof config.title === 'string'
      ? config.title
      : config.title.map((segment) => segment.label).join('/')

  return (
    <footer className="flex h-protected-footer min-h-protected-footer shrink-0 items-center justify-between gap-2 border-t bg-bg px-3 md:px-6">
      <span className="min-w-0 flex-1 truncate pr-2 font-mono text-xs text-fg-tertiary uppercase md:pr-4 md:prose-label">
        {'>_'}
        {user.email ?? 'ANONYMOUS@UNKNOWN.COM'}
        {`:${footerTitle}`}
      </span>

      {team.isBlocked && (
        <div className="inline-flex shrink-0 items-center gap-1.5 text-accent-error-highlight">
          <BlockIcon className="size-4" />
          <span className="whitespace-nowrap text-xs uppercase md:prose-label">
            Team suspended—overdue payment.{' '}
            <Link
              href={PROTECTED_URLS.BILLING(team.slug)}
              className="underline"
            >
              Pay now.
            </Link>
          </span>
        </div>
      )}

      {statusBanner}
    </footer>
  )
}
