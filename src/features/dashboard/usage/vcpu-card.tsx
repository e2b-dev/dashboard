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
import { VCPUChart } from './vcpu-chart'

async function VCPUCardContentResolver({ teamId }: { teamId: string }) {
  const result = await getUsageThroughReactCache({ teamId })

  if (!result?.data || result.serverError || result.validationErrors) {
    const errorMessage =
      result?.serverError ||
      result?.validationErrors?.formErrors?.[0] ||
      'Could not load usage data.'

    l.error({
      key: 'vcpu_card:server_error',
      error: result?.serverError,
      team_id: teamId,
      context: {
        errorMessage,
      },
    })

    throw new Error(errorMessage)
  }

  const latestVCPU =
    result.data.compute?.[result.data.compute.length - 1]?.vcpu_hours

  if (!latestVCPU) {
    return (
      <ChartPlaceholder
        emptyContent="No vCPU usage data found."
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
          }).format(latestVCPU || 0)}
        </p>
        <span className="text-fg-tertiary text-xs">hours this month</span>
      </div>
      <VCPUChart data={result.data.compute} />
    </>
  )
}

export function VCPUCard({
  teamId,
  className,
}: {
  teamId: string
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-mono">vCPU Hours</CardTitle>
        <CardDescription>
          Virtual CPU time consumed by your sandboxes per month.
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
          <VCPUCardContentResolver teamId={teamId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
