import SandboxMonitoringView from '@/features/dashboard/sandbox/monitoring/components/monitoring-view'

export default async function SandboxMonitoringPage({
  params,
}: {
  params: Promise<{ teamIdOrSlug: string; sandboxId: string }>
}) {
  const { sandboxId } = await params

  return <SandboxMonitoringView sandboxId={sandboxId} />
}
