'use client'

import { AllBuildsHeader } from '@/features/dashboard/templates/builds/all-builds-header'
import BuildsTable from '@/features/dashboard/templates/builds/table'
import useFilters from '@/features/dashboard/templates/builds/use-filters'

export default function TemplateBuildsPage() {
  const { statuses, buildIdOrTemplate } = useFilters()

  return (
    <div className="h-full min-h-0 flex-1 p-3 md:p-6 flex flex-col gap-4">
      <AllBuildsHeader />
      <BuildsTable filters={{ statuses, buildIdOrTemplate }} />
    </div>
  )
}
