import { LiveSandboxCounterServer } from '@/features/dashboard/sandboxes/live-counter.server'

interface SandboxesHeaderInjectableDefaultProps {
  params: Promise<{ teamIdOrSlug: string }>
}

export default function SandboxesHeaderInjectableDefault({
  params,
}: SandboxesHeaderInjectableDefaultProps) {
  return (
    <LiveSandboxCounterServer
      params={params}
      className="top-5 absolute right-17 max-md:hidden"
    />
  )
}
