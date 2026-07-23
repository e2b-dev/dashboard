import SandboxTerminalView from '@/features/dashboard/sandbox/terminal/view'

interface SandboxTerminalPageProps {
  searchParams: Promise<{
    command?: string
  }>
}

export default async function SandboxTerminalPage({
  searchParams,
}: SandboxTerminalPageProps) {
  const { command = '' } = await searchParams

  return <SandboxTerminalView command={command} />
}
