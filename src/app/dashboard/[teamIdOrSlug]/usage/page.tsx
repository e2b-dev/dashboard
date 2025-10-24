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
      <div className="grid grid-cols-1 md:grid-cols-2 md:h-full md:grid-rows-2 gap-6 md:flex-1">
        <UsageMetricChart metric="sandboxes" className="max-md:min-h-[400px]" />
        <UsageMetricChart metric="cost" className="max-md:min-h-[400px]" />
        <UsageMetricChart metric="vcpu" className="max-md:min-h-[400px]" />
        <UsageMetricChart metric="ram" className="max-md:min-h-[400px]" />
      </div>
    </UsageChartsProvider>
  )
}
