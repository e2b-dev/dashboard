import { notFound } from 'next/navigation'
import { INCLUDE_ARGUS } from '@/configs/flags'
import { getWebhooks } from '@/core/server/functions/webhooks/get-webhooks'
import { Page } from '@/features/dashboard/layouts/page'
import { WebhooksPageContent } from '@/features/dashboard/settings/webhooks/webhooks-page-content'

interface WebhooksPageClientProps {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function WebhooksPage({
  params,
}: WebhooksPageClientProps) {
  if (!INCLUDE_ARGUS) {
    return notFound()
  }

  const { teamSlug } = await params

  const webhooksResult = await getWebhooks({ teamSlug })

  const hasError = webhooksResult?.data === undefined

  const webhooks = webhooksResult?.data?.webhooks ?? []

  return (
    <Page>
      <WebhooksPageContent hasError={hasError} webhooks={webhooks} />
    </Page>
  )
}
