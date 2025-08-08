import CreditsCard from '@/features/dashboard/budget/credits-card'
import UsageLimits from '@/features/dashboard/budget/usage-limits'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import Frame from '@/ui/frame'

interface BudgetPageProps {
  params: Promise<{ teamIdOrSlug: string }>
}

export default async function BudgetPage({ params }: BudgetPageProps) {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  return (
    <Frame
      classNames={{
        frame: 'flex flex-col gap-4 max-md:border-none',
        wrapper: 'w-full max-md:p-0',
      }}
    >
      <CreditsCard teamId={teamId} />
      <UsageLimits teamId={teamId} />
    </Frame>
  )
}
