import { LiveSandboxCounterServer } from '@/features/dashboard/sandboxes/live-counter.server'

interface SandboxesHeaderInjectablePageProps {
  params: Promise<{ teamIdOrSlug: string }>
}

export default function SandboxesHeaderInjectablePage({
  params,
}: SandboxesHeaderInjectablePageProps) {
  return (
    <LiveSandboxCounterServer
      className="top-1/2 -translate-y-1/2 absolute right-10 max-md:hidden"
      params={params}
    />
  )
}
