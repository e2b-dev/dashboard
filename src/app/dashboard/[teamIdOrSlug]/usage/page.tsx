import { CostCard } from '@/features/dashboard/usage/cost-card'
import { RAMCard } from '@/features/dashboard/usage/ram-card'
import { SandboxesCard } from '@/features/dashboard/usage/sandboxes-card'
import { VCPUCard } from '@/features/dashboard/usage/vcpu-card'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { CatchErrorBoundary } from '@/ui/error'
import Frame from '@/ui/frame'

export default async function UsagePage({
  params,
}: {
  params: Promise<{ teamIdOrSlug: string }>
}) {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  return (
    <Frame
      classNames={{
        frame:
          'relative grid max-h-full w-full grid-cols-1 self-start lg:grid-cols-12 max-md:border-none',
        wrapper: 'w-full max-md:p-0',
      }}
    >
      <SandboxesCard
        teamId={teamId}
        className="col-span-1 min-h-[360px] border-b lg:col-span-12"
      />
      <UsagePageContent teamId={teamId} />
    </Frame>
  )
}

function UsagePageContent({ teamId }: { teamId: string }) {
  return (
    <CatchErrorBoundary
      hideFrame
      classNames={{
        wrapper: 'col-span-full bg-bg',
        errorBoundary: 'mx-auto',
      }}
    >
      <CostCard
        teamId={teamId}
        className="col-span-1 min-h-[360px] border-b lg:col-span-12"
      />
      <VCPUCard
        teamId={teamId}
        className="col-span-1 min-h-[360px] border-b lg:col-span-12 lg:border-r"
      />
      <RAMCard
        teamId={teamId}
        className="col-span-1 min-h-[360px] border-b lg:col-span-12 lg:border-b-0"
      />
    </CatchErrorBoundary>
  )
}
