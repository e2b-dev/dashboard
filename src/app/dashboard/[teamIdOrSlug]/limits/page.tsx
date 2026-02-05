import UsageLimits from '@/features/dashboard/limits/usage-limits'
import Frame from '@/ui/frame'

interface LimitsPageProps {
  params: Promise<{ teamIdOrSlug: string }>
}

export default function LimitsPage({ params }: LimitsPageProps) {
  return (
    <Frame
      classNames={{
        frame: 'flex flex-col gap-4 max-md:border-none',
        wrapper: 'w-full max-md:p-0',
      }}
    >
      <UsageLimits params={params} />
    </Frame>
  )
}
