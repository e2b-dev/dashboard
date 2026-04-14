import SandboxLogsView from '@/features/dashboard/sandbox/logs/view'

export default async function SandboxLogsPage({
  params,
}: {
  params: Promise<{ teamSlug: string; sandboxId: string }>
}) {
  const { teamSlug, sandboxId } = await params

  return <SandboxLogsView teamSlug={teamSlug} sandboxId={sandboxId} />
}
