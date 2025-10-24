import { UsageChartsProvider } from '@/features/dashboard/usage/usage-charts-context'
import { UsageMetricChart } from '@/features/dashboard/usage/usage-metric-chart'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getUsage } from '@/server/usage/get-usage'
import ErrorBoundary from '@/ui/error'

export default async function UsagePage({
  params,
}: {
  params: Promise<{ teamIdOrSlug: string }>
}) {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const result = await getUsage({ teamId })

  if (!result?.data || result.serverError || result.validationErrors) {
    return (
      <ErrorBoundary
        error={
          {
            name: 'Usage Error',
            message: result?.serverError ?? 'Failed to load usage data',
          } satisfies Error
        }
        description="Could not load usage data"
      />
    )
  }

  return (
    <UsageChartsProvider data={result.data}>
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:h-full lg:grid-rows-[3fr_2fr] lg:flex-1">
        <UsageMetricChart
          metric="sandboxes"
          className="min-h-[48svh] lg:min-h-0"
          timeRangeControlsClassName="flex lg:hidden"
        />
        <UsageMetricChart
          metric="cost"
          className="min-h-[48svh] lg:min-h-0"
          timeRangeControlsClassName="hidden lg:flex"
        />
        <UsageMetricChart
          metric="vcpu"
          className="min-h-[48svh] lg:min-h-0 lg:border-t lg:border-stroke lg:pt-3"
          timeRangeControlsClassName="flex lg:hidden"
        />
        <UsageMetricChart
          metric="ram"
          className="min-h-[48svh] lg:min-h-0 lg:border-t lg:border-stroke lg:pt-3"
          timeRangeControlsClassName="hidden"
        />
      </div>
    </UsageChartsProvider>
  )
}
