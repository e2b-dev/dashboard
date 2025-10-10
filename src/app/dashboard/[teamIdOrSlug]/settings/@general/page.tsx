import { InfoCard } from '@/features/dashboard/settings/general/info-card'
import { NameCard } from '@/features/dashboard/settings/general/name-card'
import { ProfilePictureCard } from '@/features/dashboard/settings/general/profile-picture-card'
import Frame from '@/ui/frame'

interface GeneralPageProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
}

export default async function GeneralPage({ params }: GeneralPageProps) {
  return (
    <Frame
      classNames={{
        wrapper: 'w-full max-md:p-0',
        frame: 'max-md:border-none',
      }}
    >
      <section className="col-span-full flex-col">
        <div className="flex gap-2 border-b md:gap-3">
          <ProfilePictureCard className="size-32" />
          <NameCard />
        </div>
        <InfoCard className="flex flex-col justify-between" />
      </section>
    </Frame>
  )
}
