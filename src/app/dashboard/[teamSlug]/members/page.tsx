import { Page } from '@/features/dashboard/layouts/page'
import { MemberCard } from '@/features/dashboard/members/member-card'

interface MembersPageProps {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function MembersPage({ params }: MembersPageProps) {
  return (
    <Page>
      <MemberCard params={params} />
    </Page>
  )
}
