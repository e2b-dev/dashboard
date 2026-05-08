'use client'

import { DashboardRouteError } from '@/features/dashboard/shared/route-error'

export default function AccountPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <DashboardRouteError error={error} reset={reset} />
}
