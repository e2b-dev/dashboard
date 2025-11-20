import { redirect } from 'next/navigation'

export default async function TemplatesPage({
  params,
  searchParams,
}: PageProps<'/dashboard/[teamIdOrSlug]/templates'>) {
  const { teamIdOrSlug } = await params
  const query = await searchParams

  const targetTab = query?.tab ?? 'list'

  redirect(`/dashboard/${teamIdOrSlug}/templates?tab=${targetTab}`)
}
