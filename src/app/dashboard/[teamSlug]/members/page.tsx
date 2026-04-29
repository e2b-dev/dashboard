import { Page } from '@/features/dashboard/layouts/page'
import { MembersPageContent } from '@/features/dashboard/members/members-page-content'
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
        <MembersPageContent />
      </Page>
    </HydrateClient>
  )
}
