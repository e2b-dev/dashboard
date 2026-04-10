import { Page } from '@/features/dashboard/layouts/page'
import { MemberCard } from '@/features/dashboard/members/member-card'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

interface MembersPageProps {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { teamSlug } = await params

  prefetch(trpc.teams.members.queryOptions({ teamSlug }))

  return (
    <HydrateClient>
      <Page>
        <MemberCard />
      </Page>
    </HydrateClient>
  )
}
