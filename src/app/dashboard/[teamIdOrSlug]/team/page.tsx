import DashboardPageLayout from '@/features/dashboard/page-layout'
import { Suspense } from 'react'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { NameCard } from '@/features/dashboard/team/name-card'
import { EmailCard } from '@/features/dashboard/team/email-card'
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
            <div className="col-span-12 flex items-center gap-3 pl-6 max-xl:border-b xl:col-span-6 xl:border-r">
              <ProfilePictureCard className="size-32" />
              <NameCard />
            </div>
            <EmailCard className="col-span-12 flex flex-col justify-between xl:col-span-6" />
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
