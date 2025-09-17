import { LiveSandboxCounterServer } from '@/features/dashboard/sandboxes/live-counter.server'

interface SandboxesHeaderInjectablePageProps {
  params: Promise<{ teamIdOrSlug: string }>
}

export default function SandboxesHeaderInjectablePage({
  params,
}: SandboxesHeaderInjectablePageProps) {
  return (
    <LiveSandboxCounterServer
      params={params}
      className="top-5 absolute right-17 max-md:hidden"
    />
  )
}
