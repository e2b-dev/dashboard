import { Suspense } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/ui/primitives/card'
import { CostChart } from './cost-chart'
import { ChartPlaceholder } from '@/ui/chart-placeholder'
import { getUsageThroughReactCache } from '@/server/usage/get-usage'

async function CostCardContentResolver({ teamId }: { teamId: string }) {
  const result = await getUsageThroughReactCache({ teamId })

  if (!result?.data || result.serverError || result.validationErrors) {
    const errorMessage =
      result?.serverError ||
      (Array.isArray(result?.validationErrors?.formErrors) &&
        result?.validationErrors?.formErrors[0]) ||
      'Could not load cost usage data.'
    console.error(`CostCard Error: ${errorMessage}`, result)
    throw new Error(errorMessage)
  }

  const dataFromAction = result.data

  const latestCost = dataFromAction.costSeries?.[0]?.data?.at(-1)?.y

  return (
    <>
      <div className="flex items-baseline gap-2">
        <p className="font-mono text-2xl">
          $
          {new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(latestCost || 0)}
        </p>
        <span className="text-fg-500 text-xs">this month</span>
      </div>
      <CostChart data={dataFromAction.costSeries?.[0]?.data || []} />
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
          Total cost of all resources this month.
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
