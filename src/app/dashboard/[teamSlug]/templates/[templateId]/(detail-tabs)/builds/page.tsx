'use client'

import { use, useCallback } from 'react'
import type { ListedBuildModel } from '@/core/modules/builds/models'
import BuildsTable from '@/features/dashboard/templates/builds/table'
import { TemplateBuildsHeader } from '@/features/dashboard/templates/builds/template-builds-header'
import useTemplateBuildsFilters from '@/features/dashboard/templates/builds/use-template-builds-filters'
import { isValidUuid } from '@/features/dashboard/templates/tags/helpers'

export default function TemplateDetailBuildsPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/templates/[templateId]'>) {
  const { templateId } = use(params)
  const { statuses, q } = useTemplateBuildsFilters()

  const trimmed = q?.trim() ?? ''
  const isSearching = trimmed.length > 0
  const isValidSearch = !isSearching || isValidUuid(trimmed)

  const postFilter = useCallback(
    (build: ListedBuildModel) => build.templateId === templateId,
    [templateId]
  )

  return (
    <div className="h-full min-h-0 flex-1 p-3 md:p-6 flex flex-col gap-3">
      <TemplateBuildsHeader />
      <BuildsTable
        filters={{
          statuses,
          buildIdOrTemplate:
            isSearching && isValidSearch ? trimmed : templateId,
        }}
        postFilter={isSearching && isValidSearch ? postFilter : undefined}
        disabled={isSearching && !isValidSearch}
        showTemplateColumn={false}
      />
    </div>
  )
}
