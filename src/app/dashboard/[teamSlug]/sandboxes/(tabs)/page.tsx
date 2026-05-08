import { redirect } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'

export default async function SandboxesTabsPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/sandboxes'>) {
  const { teamSlug } = await params

  redirect(PROTECTED_URLS.SANDBOXES_MONITORING(teamSlug))
}
