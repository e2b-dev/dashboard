import SandboxTerminalView from '@/features/dashboard/sandbox/terminal/view'

export default async function SandboxTerminalPage({
  params,
}: {
  params: Promise<{ teamSlug: string; sandboxId: string }>
}) {
  const { sandboxId } = await params

  return <SandboxTerminalView sandboxId={sandboxId} />
}
