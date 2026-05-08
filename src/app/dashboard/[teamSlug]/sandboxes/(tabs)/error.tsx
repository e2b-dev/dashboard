'use client'

import { DashboardRouteError } from '@/features/dashboard/shared/route-error'

export default function SandboxesTabsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <DashboardRouteError error={error} reset={reset} />
}
