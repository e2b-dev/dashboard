import { redirect } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'

type WebhookDetailPageProps = {
  params: Promise<{
    teamSlug: string
    webhookId: string
  }>
}

export default async function WebhookDetailPage({
  params,
}: WebhookDetailPageProps) {
  const { teamSlug, webhookId } = await params

  redirect(PROTECTED_URLS.WEBHOOK_OVERVIEW(teamSlug, webhookId))
}
