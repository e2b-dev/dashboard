import CreditsCard from '@/features/dashboard/budget/credits-card'
import UsageLimits from '@/features/dashboard/budget/usage-limits'
import Frame from '@/ui/frame'

interface BudgetPageProps {
  params: Promise<{ teamIdOrSlug: string }>
}

export default function BudgetPage({ params }: BudgetPageProps) {
  return (
    <Frame
      classNames={{
        frame: 'flex flex-col gap-4 max-md:border-none',
        wrapper: 'w-full max-md:p-0',
      }}
    >
      <CreditsCard params={params} />
      <UsageLimits params={params} />
    </Frame>
  )
}
