import DashboardPageLayout from '@/features/dashboard/page-layout'
import { Suspense } from 'react'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { NameCard } from '@/features/dashboard/team/name-card'
import { InfoCard } from '@/features/dashboard/team/info-card'
import { MemberCard } from '@/features/dashboard/team/member-card'
import { ProfilePictureCard } from '@/features/dashboard/team/profile-picture-card'
import Scanline from '@/ui/scanline'

interface GeneralPageProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
}

export default async function GeneralPage({ params }: GeneralPageProps) {
  const { teamIdOrSlug } = await params
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  return (
    <DashboardPageLayout title="Team">
      <div className="grid w-full grid-cols-12">
        <Suspense>
          <>
            <div className="col-span-12 flex gap-2 max-xl:border-b md:gap-3 xl:col-span-6 xl:border-r">
              <ProfilePictureCard className="size-32" />
              <NameCard />
            </div>
            <InfoCard className="col-span-12 flex flex-col justify-between xl:col-span-6" />
          </>
        </Suspense>

        <section className="col-span-full border-t">
          <div className="relative h-2 border-b">
            <Scanline />
          </div>
          <MemberCard teamId={teamId} className="" />
        </section>
      </div>
    </DashboardPageLayout>
  )
}
