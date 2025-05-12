import { Suspense } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/ui/primitives/card'
import { VCPUChart } from './vcpu-chart'
import { ChartPlaceholder } from '@/ui/chart-placeholder'
import { getUsageThroughReactCache } from '@/server/usage/get-usage'
import { logError } from '@/lib/clients/logger'

async function VCPUCardContentResolver({ teamId }: { teamId: string }) {
  const result = await getUsageThroughReactCache({ teamId })

  if (!result?.data || result.serverError || result.validationErrors) {
    const errorMessage =
      result?.serverError ||
      result?.validationErrors?.formErrors?.[0] ||
      'Could not load usage data.'

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
        <p className="font-mono text-2xl">
          {new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(latestVCPU || 0)}
        </p>
        <span className="text-fg-500 text-xs">hours this month</span>
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
          Virtual CPU time consumed by your sandboxes this month.
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
