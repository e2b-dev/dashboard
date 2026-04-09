import { Page } from '@/features/dashboard/layouts/page'
import { TeamAvatar } from '@/features/dashboard/settings/general/team-avatar'
import { TeamInfo } from '@/features/dashboard/settings/general/team-info'
import { TeamName } from '@/features/dashboard/settings/general/team-name'

export default async function GeneralPage() {
  return (
    <Page>
      <div className="flex gap-8 py-6">
        <TeamAvatar />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <TeamName />
          <div className="border-b" />
          <TeamInfo />
        </div>
      </div>
    </Page>
  )
}
