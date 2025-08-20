import { SandboxesMonitoringPageParams } from '@/app/dashboard/[teamIdOrSlug]/sandboxes/monitoring/page'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getTeamMetrics } from '@/server/sandboxes/get-team-metrics'
import ErrorTooltip from '@/ui/error-tooltip'
import { AlertTriangle } from 'lucide-react'
import {
  ConcurrentSandboxesClient,
  SandboxesStartRateClient,
} from './header.client'

const BaseCard = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="p-3 md:p-6 max-md:not-last:border-b md:not-last:border-r h-full flex-1 w-full flex flex-col justify-center items-center gap-3 relative">
      {children}
    </div>
  )
}

const BaseSubtitle = ({ children }: { children: React.ReactNode }) => {
  return <span className="label-tertiary">{children}</span>
}

export default function SandboxesMonitoringHeader({
  params,
}: {
  params: Promise<SandboxesMonitoringPageParams>
}) {
  return (
    <div className="flex md:flex-row flex-col items-center border-b w-full min-h-52">
      <BaseCard>
        <ConcurrentSandboxesShell params={params} />
        <BaseSubtitle>Concurrent Sandboxes</BaseSubtitle>
      </BaseCard>
      <BaseCard>
        <SandboxesStartRateShell />
        <BaseSubtitle>Created Sandboxes Per Second</BaseSubtitle>
      </BaseCard>
    </div>
  )
}

// SHELLS

export const ConcurrentSandboxesShell = async ({
  params,
}: {
  params: Promise<SandboxesMonitoringPageParams>
}) => {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const teamMetricsResult = await getTeamMetrics({
    teamId,
    startDate: Date.now() - 10000,
    endDate: Date.now(),
  })

  if (!teamMetricsResult?.data || teamMetricsResult.serverError) {
    return (
      <ErrorTooltip
        trigger={
          <span className="ml-2 inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-accent-error-highlight" />
            <span className="prose-body-highlight text-accent-error-highlight">
              Failed
            </span>
          </span>
        }
      >
        {teamMetricsResult?.serverError ||
          'Failed to load concurrent sandboxes'}
      </ErrorTooltip>
    )
  }

  const concurrentSandboxes =
    teamMetricsResult.data[0]?.concurrentSandboxes ?? 0

  return <ConcurrentSandboxesClient concurrentSandboxes={concurrentSandboxes} />
}

export const SandboxesStartRateShell = () => {
  return <SandboxesStartRateClient sandboxesStartRate={0.2} />
}
