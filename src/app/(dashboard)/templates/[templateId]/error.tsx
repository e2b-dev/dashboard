'use client'

import { TRPCClientError } from '@trpc/client'
import { notFound } from 'next/navigation'
import { DashboardRouteError } from '@/features/dashboard/shared/route-error'

export default function TemplateDetailsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  if (error instanceof TRPCClientError && error.data?.code === 'NOT_FOUND') {
    notFound()
  }

  return <DashboardRouteError error={error} reset={reset} />
}
