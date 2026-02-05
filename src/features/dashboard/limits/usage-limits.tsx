'use client'

import { useRouteParams } from '@/lib/hooks/use-route-params'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
import ErrorBoundary from '@/ui/error'
import { Skeleton } from '@/ui/primitives/skeleton'
import { useQuery } from '@tanstack/react-query'
import AlertCard from './alert-card'
import LimitCard from './limit-card'

interface UsageLimitsProps {
  className?: string
}

export default function UsageLimits({ className }: UsageLimitsProps) {
  const { teamIdOrSlug } = useRouteParams<'/dashboard/[teamIdOrSlug]/limits'>()
  const trpc = useTRPC()

  const { data: limits, isLoading, error } = useQuery(
    trpc.billing.getLimits.queryOptions({ teamIdOrSlug })
  )

  if (isLoading) {
    return (
      <div className={cn('flex flex-col border-t lg:flex-row', className)}>
        <div className="flex-1 border-r p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  if (error || !limits) {
    return (
      <ErrorBoundary
        error={
          {
            name: 'Usage Limits Error',
            message: error?.message || 'Failed to load usage limits',
          } satisfies Error
        }
        hideFrame
      />
    )
  }

  return (
    <div className={cn('flex flex-col border-t lg:flex-row', className)}>
      <LimitCard value={limits.limit_amount_gte} className="flex-1 border-r" />
      <AlertCard value={limits.alert_amount_gte} className="flex-1" />
    </div>
  )
}
