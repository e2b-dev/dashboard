import { SandboxProvider } from '@/features/dashboard/sandbox/context'
import SandboxDetailsHeader from '@/features/dashboard/sandbox/header'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getSandboxDetails } from '@/server/sandboxes/get-sandbox-details'
import { Separator } from '@/ui/primitives/separator'

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
        <SandboxDetailsHeader sandboxInfo={res?.data} />
        <Separator />
        <main>{children}</main>
      </div>
    </SandboxProvider>
  )
}
