import { redirect } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'

export default async function TemplateDetailPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/templates/[templateId]'>) {
  const { teamSlug, templateId } = await params

  redirect(PROTECTED_URLS.TEMPLATE_OVERVIEW(teamSlug, templateId))
}
