import { l } from '@/lib/clients/logger/logger'
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
import { RAMChart } from './ram-chart'

async function RAMCardContentResolver({ teamId }: { teamId: string }) {
  const result = await getUsageThroughReactCache({ teamId })

  if (!result?.data || result.serverError || result.validationErrors) {
    const errorMessage =
      result?.serverError ||
      (Array.isArray(result?.validationErrors?.formErrors) &&
        result?.validationErrors?.formErrors[0]) ||
      'Could not load RAM usage data.'

    l.error({
      key: 'ram_card:server_error',
      error: result?.serverError,
      team_id: teamId,
      context: {
        errorMessage,
      },
    })

    throw new Error(errorMessage)
  }

  const latestRAM =
    result.data.compute?.[result.data.compute.length - 1]?.ram_gb_hours

  if (!latestRAM) {
    return (
      <ChartPlaceholder
        emptyContent="No RAM usage data found."
        classNames={{ container: 'h-48' }}
      />
    )
  }

  return (
    <>
      <div className="flex items-baseline gap-2">
        <p className="font-mono prose-value-big">
          {new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(latestRAM || 0)}
        </p>
        <span className="text-fg-tertiary text-xs">GB-hours this month</span>
      </div>
      <RAMChart data={result.data.compute} />
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
          Memory usage duration across all sandboxes per month.
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
