import { Suspense } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/ui/primitives/card'
import { RAMChart } from './ram-chart'
import { ChartPlaceholder } from '@/ui/chart-placeholder'
import { getUsageThroughReactCache } from '@/server/usage/get-usage'

async function RAMCardContentResolver({ teamId }: { teamId: string }) {
  const result = await getUsageThroughReactCache({ teamId })

  if (!result?.data || result.serverError || result.validationErrors) {
    const errorMessage =
      result?.serverError ||
      (Array.isArray(result?.validationErrors?.formErrors) &&
        result?.validationErrors?.formErrors[0]) ||
      'Could not load RAM usage data.'
    console.error(`RAMCard Error: ${errorMessage}`, result)
    throw new Error(errorMessage)
  }

  const dataFromAction = result.data

  const latestRAM = dataFromAction.ramSeries?.[0]?.data?.at(-1)?.y

  return (
    <>
      <div className="flex items-baseline gap-2">
        <p className="font-mono text-2xl">
          {new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(latestRAM || 0)}
        </p>
        <span className="text-fg-500 text-xs">GB-hours this month</span>
      </div>
      <RAMChart data={dataFromAction.ramSeries?.[0]?.data || []} />
    </>
  )
}

export function RAMCard({
  teamId,
  className,
}: {
  teamId: string
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-mono">RAM Hours</CardTitle>
        <CardDescription>
          Memory usage duration across all sandboxes this month.
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
          <RAMCardContentResolver teamId={teamId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
