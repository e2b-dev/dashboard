import { Suspense } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import {
  TEMPLATES_DEFAULT_SORT,
  TEMPLATES_PAGE_SIZE,
} from '@/features/dashboard/templates/list/constants'
import TemplatesTable from '@/features/dashboard/templates/list/table'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function TemplatesListPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/templates/list'>) {
  const { teamSlug } = await params

  prefetch(
    trpc.templates.getTemplates.infiniteQueryOptions(
      {
        teamSlug,
        limit: TEMPLATES_PAGE_SIZE,
        sort: TEMPLATES_DEFAULT_SORT,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialCursor: undefined,
      }
    )
  )

  return (
    <HydrateClient>
      <Suspense fallback={<LoadingLayout />}>
        <TemplatesTable />
      </Suspense>
    </HydrateClient>
  )
}
