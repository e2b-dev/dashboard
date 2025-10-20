import { SandboxProvider } from '@/features/dashboard/sandbox/context'
import SandboxDetailsHeader from '@/features/dashboard/sandbox/header/header'
import SandboxLayoutClient from '@/features/dashboard/sandbox/layout'
import { getSandboxDetails } from '@/server/sandboxes/get-sandbox-details'

interface SandboxLayoutProps {
  children: React.ReactNode
  params: Promise<{ teamIdOrSlug: string; sandboxId: string }>
}

export default async function SandboxLayout({
  children,
  params,
}: SandboxLayoutProps) {
  const { teamIdOrSlug, sandboxId } = await params

  const res = await getSandboxDetails({ teamIdOrSlug, sandboxId })

  const exists = res?.serverError !== 'SANDBOX_NOT_FOUND'

  if (!res?.data || res?.serverError) {
    console.error(
      'SANDBOX_DETAILS_LAYOUT',
      res?.serverError || 'Unknown error',
      res?.data
    )
  }

  return (
    <SandboxProvider
      teamId={teamIdOrSlug}
      serverSandboxInfo={res?.data}
      isRunning={exists}
    >
      <SandboxLayoutClient
        teamIdOrSlug={teamIdOrSlug}
        header={
          <SandboxDetailsHeader
            teamIdOrSlug={teamIdOrSlug}
            state={exists ? 'running' : 'paused'}
          />
        }
      >
        {children}
      </SandboxLayoutClient>
    </SandboxProvider>
  )
}
