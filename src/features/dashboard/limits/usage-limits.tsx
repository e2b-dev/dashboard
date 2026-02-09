'use client'

import { useRouteParams } from '@/lib/hooks/use-route-params'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
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

  const { data: limits, isLoading } = useQuery({
    ...trpc.billing.getLimits.queryOptions({ teamIdOrSlug }),
    throwOnError: true,
  })

  if (isLoading || !limits) {
    return (
      <div className={cn('flex flex-col lg:flex-row', className)}>
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

  return (
    <div className={cn('flex flex-col lg:flex-row', className)}>
      <LimitCard value={limits.limit_amount_gte} className="flex-1 border-r" />
      <AlertCard value={limits.alert_amount_gte} className="flex-1" />
    </div>
  )
}
