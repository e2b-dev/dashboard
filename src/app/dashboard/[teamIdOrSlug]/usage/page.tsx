import { UsageChartsProvider } from '@/features/dashboard/usage/usage-charts-context'
import { UsageMetricChart } from '@/features/dashboard/usage/usage-metric-chart'
import { getUsage } from '@/server/usage/get-usage'
import ErrorBoundary from '@/ui/error'
import Frame from '@/ui/frame'

export default async function UsagePage({
  params,
}: {
  params: Promise<{ teamIdOrSlug: string }>
}) {
  const { teamIdOrSlug } = await params
  const result = await getUsage({ teamIdOrSlug })

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
      <div className="flex-1 overflow-y-auto max-h-full min-h-0">
        <div className="container mx-auto p-0 md:p-8 2xl:p-24 max-w-[1800px]">
          <Frame
            classNames={{
              wrapper: 'w-full lg:h-[75vh] lg:min-h-[700px]',
              frame: 'lg:h-full max-lg:border-0',
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 lg:h-full">
              <UsageMetricChart
                metric="sandboxes"
                className="min-h-[48svh] lg:min-h-0 lg:h-full"
                timeRangeControlsClassName="flex lg:hidden"
              />
              <UsageMetricChart
                metric="cost"
                className="min-h-[48svh] lg:min-h-0 lg:h-full"
                timeRangeControlsClassName="hidden lg:flex"
              />
              <UsageMetricChart
                metric="vcpu"
                className="min-h-[48svh] lg:min-h-0 lg:h-full lg:border-t lg:border-stroke"
                timeRangeControlsClassName="flex lg:hidden"
              />
              <UsageMetricChart
                metric="ram"
                className="min-h-[48svh] lg:min-h-0 lg:h-full lg:border-t lg:border-stroke"
                timeRangeControlsClassName="hidden"
              />
            </div>
          </Frame>
        </div>
      </div>
    </UsageChartsProvider>
  )
}
