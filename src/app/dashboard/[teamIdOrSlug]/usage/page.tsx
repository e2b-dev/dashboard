import { INCLUDE_BILLING } from '@/configs/flags'
import DashboardPageLayout from '@/features/dashboard/page-layout'
import { CostCard } from '@/features/dashboard/usage/cost-card'
import { RAMCard } from '@/features/dashboard/usage/ram-card'
import { SandboxesCard } from '@/features/dashboard/usage/sandboxes-card'
import { VCPUCard } from '@/features/dashboard/usage/vcpu-card'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getUsage } from '@/server/usage/get-usage'
import { AssemblyLoader } from '@/ui/loader'
import { Suspense } from 'react'

export default async function UsagePage({
  params,
}: {
  params: Promise<{ teamIdOrSlug: string }>
}) {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  return (
    <DashboardPageLayout
      title="Usage"
      className="relative grid max-h-full min-h-[calc(360px+320px)] w-full grid-cols-1 self-start lg:grid-cols-12"
    >
      <SandboxesCard
        teamId={teamId}
        className="col-span-1 min-h-[360px] border-b lg:col-span-12"
      />
      {INCLUDE_BILLING && (
        <Suspense
          fallback={
            <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-3">
              <AssemblyLoader gridWidth={7} gridHeight={3} />
              <h2 className="text-fg-500 text-lg font-medium">
                Collecting data
              </h2>
            </div>
          }
        >
          <UsagePageContent teamId={teamId} />
        </Suspense>
      )}
    </DashboardPageLayout>
  )
}

async function UsagePageContent({ teamId }: { teamId: string }) {
  const res = await getUsage({ teamId })

  if (!res?.data || res.serverError || res.validationErrors) {
    throw new Error(res?.serverError || 'Failed to load usage')
  }

  const data = res.data

  return (
    <>
      <CostCard
        data={data}
        className="col-span-1 min-h-[360px] border-b lg:col-span-12"
      />
      <VCPUCard
        data={data}
        className="col-span-1 min-h-[320px] border-b lg:col-span-6 lg:border-r lg:border-b-0"
      />
      <RAMCard
        data={data}
        className="col-span-1 min-h-[320px] border-b lg:col-span-6 lg:border-b-0"
      />
    </>
  )
}
