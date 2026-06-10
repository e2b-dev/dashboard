import { Page } from '@/features/dashboard/layouts/page'
import { MembersPageContent } from '@/features/dashboard/members/members-page-content'
import { HydrateClient } from '@/trpc/server'

interface MembersPageProps {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function MembersPage({ params }: MembersPageProps) {
  await params

  return (
    <HydrateClient>
      <Page>
        <MembersPageContent />
      </Page>
    </HydrateClient>
  )
}
