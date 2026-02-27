import SandboxLogsView from '@/features/dashboard/sandbox/logs/view'

export default async function SandboxLogsPage({
  params,
}: {
  params: Promise<{ teamIdOrSlug: string; sandboxId: string }>
}) {
  const { teamIdOrSlug, sandboxId } = await params

  return <SandboxLogsView teamIdOrSlug={teamIdOrSlug} sandboxId={sandboxId} />
}
