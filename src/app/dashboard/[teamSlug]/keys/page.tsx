import { Page } from '@/features/dashboard/layouts/page'
import { ApiKeysPageContent } from '@/features/dashboard/settings/keys'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'
import { Card, CardContent } from '@/ui/primitives/card'

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
        <Card className="border-stroke/80">
          <CardContent className="pb-8 pt-6">
            <ApiKeysPageContent teamSlug={teamSlug} />
          </CardContent>
        </Card>
      </Page>
    </HydrateClient>
  )
}
