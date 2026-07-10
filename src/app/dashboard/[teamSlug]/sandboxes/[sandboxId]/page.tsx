import { redirect } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'

export default async function SandboxDetailPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/sandboxes/[sandboxId]'>) {
  const { teamSlug, sandboxId } = await params

  redirect(PROTECTED_URLS.SANDBOX(teamSlug, sandboxId))
}
