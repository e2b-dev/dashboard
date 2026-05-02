import { Page } from '@/features/dashboard/layouts/page'
import { ApiKeysPageContent } from '@/features/dashboard/settings/keys'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

interface KeysPageProps {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function KeysPage({ params }: KeysPageProps) {
  const { teamSlug } = await params

  prefetch(trpc.teams.listApiKeys.queryOptions({ teamSlug }))

  return (
    <HydrateClient>
      <Page>
        <ApiKeysPageContent />
      </Page>
    </HydrateClient>
  )
}
