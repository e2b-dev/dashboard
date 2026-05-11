import { redirect } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'

export default async function TemplatesTabsPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/templates'>) {
  const { teamSlug } = await params

  redirect(PROTECTED_URLS.TEMPLATES_LIST(teamSlug))
}
