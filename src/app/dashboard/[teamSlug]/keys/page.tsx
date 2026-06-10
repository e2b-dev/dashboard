import { Page } from '@/features/dashboard/layouts/page'
import { ApiKeysPageContent } from '@/features/dashboard/settings/keys'
import { HydrateClient } from '@/trpc/server'

interface KeysPageProps {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function KeysPage({ params }: KeysPageProps) {
  await params

  return (
    <HydrateClient>
      <Page>
        <ApiKeysPageContent />
      </Page>
    </HydrateClient>
  )
}
