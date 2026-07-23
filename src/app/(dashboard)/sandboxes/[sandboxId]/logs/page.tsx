import SandboxLogsView from '@/features/dashboard/sandbox/logs/view'

export default async function SandboxLogsPage({
  params,
}: {
  params: Promise<{ sandboxId: string }>
}) {
  const { sandboxId } = await params

  return <SandboxLogsView sandboxId={sandboxId} />
}
