import { redirect } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'

export default async function TemplateDetailPage({
  params,
}: PageProps<'/templates/[templateId]'>) {
  const { templateId } = await params

  redirect(PROTECTED_URLS.TEMPLATE_OVERVIEW(templateId))
}
