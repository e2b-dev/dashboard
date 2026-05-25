'use client'

import { use, useCallback } from 'react'
import type { ListedBuildModel } from '@/core/modules/builds/models'
import BuildsTable from '@/features/dashboard/templates/builds/table'
import { TemplateBuildsHeader } from '@/features/dashboard/templates/builds/template-builds-header'
import useTemplateBuildsFilters from '@/features/dashboard/templates/builds/use-template-builds-filters'

export default function TemplateDetailBuildsPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/templates/[templateId]'>) {
  const { templateId } = use(params)
  const { statuses, q } = useTemplateBuildsFilters()

  // Substring match on build ID over the already-loaded pages. The
  // backend query stays scoped by templateID (authoritative).
  const postFilter = useCallback(
    (build: ListedBuildModel) => {
      if (!q) return true
      return build.id.toLowerCase().includes(q.toLowerCase())
    },
    [q]
  )

  return (
    <div className="h-full min-h-0 flex-1 p-3 md:p-6 flex flex-col gap-3">
      <TemplateBuildsHeader />
      <BuildsTable
        filters={{ statuses, buildIdOrTemplate: templateId }}
        postFilter={postFilter}
        showTemplateColumn={false}
      />
    </div>
  )
}
