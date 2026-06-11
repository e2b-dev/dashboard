import { Page } from '@/features/dashboard/layouts/page'
import { SecretsPageContent } from '@/features/dashboard/settings/secrets/secrets-page-content'

interface SecretsPageProps {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function SecretsPage(_props: SecretsPageProps) {
  return (
    <Page>
      <SecretsPageContent />
    </Page>
  )
}
