import { CostCard } from '@/features/dashboard/usage/cost-card'
import { RAMCard } from '@/features/dashboard/usage/ram-card'
import { SandboxesCard } from '@/features/dashboard/usage/sandboxes-card'
import { VCPUCard } from '@/features/dashboard/usage/vcpu-card'
import { CatchErrorBoundary } from '@/ui/error'
import Frame from '@/ui/frame'

export default async function UsagePage({
  params,
}: {
  params: Promise<{ teamIdOrSlug: string }>
}) {
  return (
    <Frame
      classNames={{
        frame:
          'relative grid max-h-full w-full grid-cols-1 self-start lg:grid-cols-12 max-md:border-none',
        wrapper: 'w-full max-md:p-0',
      }}
    >
      <SandboxesCard
        params={params}
        className="col-span-1 min-h-[360px] border-b lg:col-span-12"
      />
      <UsagePageContent params={params} />
    </Frame>
  )
}

function UsagePageContent({
  params,
}: {
  params: Promise<{ teamIdOrSlug: string }>
}) {
  return (
    <CatchErrorBoundary
      hideFrame
      classNames={{
        wrapper: 'col-span-full bg-bg',
        errorBoundary: 'mx-auto',
      }}
    >
      <CostCard
        params={params}
        className="col-span-1 min-h-[360px] border-b lg:col-span-12"
      />
      <VCPUCard
        params={params}
        className="col-span-1 min-h-[360px] border-b lg:col-span-12 lg:border-r"
      />
      <RAMCard
        params={params}
        className="col-span-1 min-h-[360px] border-b lg:col-span-12 lg:border-b-0"
      />
    </CatchErrorBoundary>
  )
}
