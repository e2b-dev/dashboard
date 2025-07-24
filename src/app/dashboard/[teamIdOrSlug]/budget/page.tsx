import CreditsCard from '@/features/dashboard/budget/credits-card'
import UsageLimits from '@/features/dashboard/budget/usage-limits'
import DashboardPageLayout from '@/features/dashboard/page-layout'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'

interface BudgetPageProps {
  params: Promise<{ teamIdOrSlug: string }>
}

export default async function BudgetPage({ params }: BudgetPageProps) {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  return (
    <DashboardPageLayout title="Budget" className="flex flex-col gap-4">
      <CreditsCard teamId={teamId} />
      <UsageLimits teamId={teamId} />
    </DashboardPageLayout>
  )
}
