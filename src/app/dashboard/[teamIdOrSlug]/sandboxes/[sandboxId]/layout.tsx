import { SandboxProvider } from '@/features/dashboard/sandbox/context'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getSandboxDetails } from '@/server/sandboxes/get-sandbox-details'
import SandboxLayoutClient from '@/features/dashboard/sandbox/layout'
import SandboxDetailsHeader from '@/features/dashboard/sandbox/header/header'

export const fetchCache = 'force-no-store'

interface SandboxLayoutProps {
  children: React.ReactNode
  params: Promise<{ teamIdOrSlug: string; sandboxId: string }>
}

export default async function SandboxLayout({
  children,
  params,
}: SandboxLayoutProps) {
  const { teamIdOrSlug, sandboxId } = await params

  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)
  const res = await getSandboxDetails({ teamId, sandboxId })

  let exists = false

  if (res?.serverError !== 'SANDBOX_NOT_FOUND') {
    exists = true
  }

  if (!res?.data || res?.serverError) {
    console.error(
      'SANDBOX_DETAILS_LAYOUT',
      res?.serverError || 'Unknown error',
      res?.data
    )
  }

  return (
    <SandboxProvider
      teamId={teamId}
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
