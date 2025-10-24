import { CostChart } from '@/features/dashboard/usage/cost-chart'
import { RAMChart } from '@/features/dashboard/usage/ram-chart'
import { SandboxesChart } from '@/features/dashboard/usage/sandboxes-chart'
import { UsageChartsProvider } from '@/features/dashboard/usage/usage-charts-context'
import { VCPUChart } from '@/features/dashboard/usage/vcpu-chart'
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
        <SandboxesChart className="max-md:min-h-[400px]" />
        <CostChart className="max-md:min-h-[400px]" />
        <VCPUChart className="max-md:min-h-[400px]" />
        <RAMChart className="max-md:min-h-[400px]" />
      </div>
    </UsageChartsProvider>
  )
}
