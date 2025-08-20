import SandboxesMonitoringHeader from '@/features/dashboard/sandboxes/monitoring/header'

export interface SandboxesMonitoringPageParams {
  teamIdOrSlug: string
}

interface SandboxesMonitoringPageProps {
  params: Promise<SandboxesMonitoringPageParams>
}

export default async function SandboxesMonitoringPage({
  params,
}: SandboxesMonitoringPageProps) {
  return (
    <div className="flex flex-col h-full">
      <SandboxesMonitoringHeader params={params} />
    </div>
  )
}
