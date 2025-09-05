import { LiveSandboxCounterServer } from '@/features/dashboard/sandboxes/live-counter.server'

interface SandboxesHeaderInjectableCatchAllDefaultProps {
  params: Promise<{ teamIdOrSlug: string }>
}

export default function SandboxesHeaderInjectableCatchAllDefault({
  params,
}: SandboxesHeaderInjectableCatchAllDefaultProps) {
  return (
    <LiveSandboxCounterServer
      params={params}
      className="top-5 absolute right-15"
    />
  )
}
