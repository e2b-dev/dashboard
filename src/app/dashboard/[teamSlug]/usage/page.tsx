import { redirect } from 'next/navigation'
import { AUTH_URLS } from '@/configs/urls'
import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import { getUsage } from '@/core/server/functions/usage/get-usage'
import { UsageRedesignPage } from '@/features/dashboard/usage/redesign/usage-redesign'
import { UsageChartsProvider } from '@/features/dashboard/usage/usage-charts-context'
import { UsageMetricChart } from '@/features/dashboard/usage/usage-metric-chart'
import { UsageTopTimeRangeControls } from '@/features/dashboard/usage/usage-top-time-range-controls'
import ErrorBoundary from '@/ui/error'
import Frame from '@/ui/frame'

export default async function UsagePage({
  params,
}: {
  params: Promise<{ teamSlug: string }>
}) {
  const { teamSlug } = await params

  const authContext = await getAuthContext()

  if (!authContext) {
    redirect(AUTH_URLS.SIGN_IN)
  }

  const teamId = await getTeamIdFromSlug(teamSlug, authContext.accessToken)

  const newUsagePage = await featureFlags.isEnabled('newUsagePage', {
    user: {
      id: authContext.user.id,
      email: authContext.user.email ?? undefined,
    },
    team:
      teamId.ok && teamId.data
        ? { id: teamId.data, slug: teamSlug }
        : undefined,
  })

  const result = await getUsage({ teamSlug })

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

  if (newUsagePage) {
    return (
      <UsageChartsProvider data={result.data}>
        <UsageRedesignPage />
      </UsageChartsProvider>
    )
  }

  return (
    <UsageChartsProvider data={result.data}>
      <div className="h-full max-h-full min-h-0 overflow-y-auto">
        <div className="container mx-auto p-0 md:p-8 2xl:px-24 2xl:py-8 max-w-[1800px] lg:flex lg:flex-col lg:h-full">
          <Frame
            classNames={{
              wrapper: 'w-full lg:flex-1 lg:min-h-[700px] lg:max-h-full',
              frame: 'lg:h-full max-lg:border-0 lg:flex lg:flex-col',
            }}
          >
            <div className="hidden lg:flex lg:justify-end lg:px-3 lg:pt-3">
              <UsageTopTimeRangeControls />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 lg:min-h-0 lg:flex-1">
              <UsageMetricChart
                metric="sandboxes"
                className="min-h-[48svh] lg:min-h-0 lg:h-full"
                timeRangeControlsClassName="flex lg:hidden"
              />
              <UsageMetricChart
                metric="cost"
                className="min-h-[48svh] lg:min-h-0 lg:h-full"
                timeRangeControlsClassName="hidden"
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
