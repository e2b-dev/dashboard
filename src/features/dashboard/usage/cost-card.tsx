import { l } from '@/lib/clients/logger'
import { getUsageThroughReactCache } from '@/server/usage/get-usage'
import { ChartPlaceholder } from '@/ui/chart-placeholder'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { Suspense } from 'react'
import { CostChart } from './cost-chart'

async function CostCardContentResolver({ teamId }: { teamId: string }) {
  const result = await getUsageThroughReactCache({ teamId })

  if (!result?.data || result.serverError || result.validationErrors) {
    const errorMessage =
      result?.serverError ||
      (Array.isArray(result?.validationErrors?.formErrors) &&
        result?.validationErrors?.formErrors[0]) ||
      'Could not load cost usage data.'

    l.error({
      key: 'cost_card:server_error',
      error: result?.serverError,
      team_id: teamId,
      context: {
        errorMessage,
      },
    })

    throw new Error(errorMessage)
  }

  const dataFromAction = result.data

  const latestCost =
    dataFromAction.compute?.[dataFromAction.compute.length - 1]?.total_cost

  if (!latestCost) {
    return (
      <ChartPlaceholder
        emptyContent="No cost data found."
        classNames={{ container: 'h-48' }}
      />
    )
  }

  return (
    <>
      <div className="flex items-baseline gap-2">
        <p className="font-mono prose-value-big">
          $
          {new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(latestCost || 0)}
        </p>
        <span className="text-fg-tertiary text-xs">this month</span>
      </div>
      <CostChart data={dataFromAction.compute} />
    </>
  )
}

export function CostCard({
  teamId,
  className,
}: {
  teamId: string
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-mono">Usage Costs</CardTitle>
        <CardDescription>
          Total cost of all resources per month.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Suspense
          fallback={
            <ChartPlaceholder
              isLoading={true}
              classNames={{ container: 'h-48' }}
            />
          }
        >
          <CostCardContentResolver teamId={teamId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
