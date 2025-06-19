import { SandboxProvider } from '@/features/dashboard/sandbox/context'
import SandboxDetailsHeader from '@/features/dashboard/sandbox/header'
import SandboxDetailsTabs from '@/features/dashboard/sandbox/tabs'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
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

  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)
  const res = await getSandboxDetails({ teamId, sandboxId })

  if (!res?.data || res?.serverError) {
    throw new Error(res?.serverError || 'Unable to get sandbox details')
  }

  return (
    <SandboxProvider sandboxInfo={res?.data} teamId={teamId}>
      <div>
        <SandboxDetailsHeader
          teamIdOrSlug={teamIdOrSlug}
          sandboxInfo={res?.data}
        />
        <SandboxDetailsTabs tabs={['inspect']}>{children}</SandboxDetailsTabs>
      </div>
    </SandboxProvider>
  )
}
