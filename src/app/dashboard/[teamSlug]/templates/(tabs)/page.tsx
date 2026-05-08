import { Suspense } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import BuildsHeader from '@/features/dashboard/templates/builds/header'
import BuildsTable from '@/features/dashboard/templates/builds/table'
import TemplatesTable from '@/features/dashboard/templates/list/table'

type TemplatesSearchParams = {
  tab?: string
}

export default async function TemplatesTabsPage({
  searchParams,
}: PageProps<'/dashboard/[teamSlug]/templates'> & {
  searchParams: Promise<TemplatesSearchParams>
}) {
  const { tab } = await searchParams
  const activeTab = tab === 'builds' ? 'builds' : 'list'

  if (activeTab === 'builds') {
    return (
      <div className="h-full min-h-0 flex-1 p-3 md:p-6 flex flex-col gap-3">
        <BuildsHeader />
        <BuildsTable />
      </div>
    )
  }

  return (
    <Suspense fallback={<LoadingLayout />}>
      <TemplatesTable />
    </Suspense>
  )
}
