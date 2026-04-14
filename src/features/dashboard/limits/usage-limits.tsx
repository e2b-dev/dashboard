'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
import { Skeleton } from '@/ui/primitives/skeleton'
import { useDashboard } from '../context'
import { UsageAlertSection } from './usage-alert-section'
import { UsageLimitSection } from './usage-limit-section'

interface UsageLimitsProps {
  className?: string
}

export const UsageLimits = ({ className }: UsageLimitsProps) => {
  const { teamSlug } = useRouteParams<'/dashboard/[teamSlug]/limits'>()
  const { team } = useDashboard()
  const trpc = useTRPC()

  const { data: limits, isLoading } = useQuery({
    ...trpc.billing.getLimits.queryOptions({ teamSlug }),
    throwOnError: true,
  })

  if (!team) return null

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-[600px] flex-col gap-12 pt-8',
        className
      )}
    >
      {isLoading || !limits ? (
        <>
          <LimitsSectionSkeleton />
          <LimitsSectionSkeleton />
        </>
      ) : (
        <>
          <UsageLimitSection
            email={team.email}
            teamSlug={teamSlug}
            value={limits.limit_amount_gte}
          />
          <UsageAlertSection
            email={team.email}
            teamSlug={teamSlug}
            value={limits.alert_amount_gte}
          />
        </>
      )}
    </div>
  )
}

const LimitsSectionSkeleton = () => (
  <div className="flex flex-col gap-4">
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-[72px] w-full" />
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-full max-w-[430px]" />
      <Skeleton className="h-5 w-full max-w-[470px]" />
    </div>
  </div>
)
