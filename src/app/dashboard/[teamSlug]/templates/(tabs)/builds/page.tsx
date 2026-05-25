import { AllBuildsHeader } from '@/features/dashboard/templates/builds/all-builds-header'
import BuildsTable from '@/features/dashboard/templates/builds/table'

export default function TemplateBuildsPage() {
  return (
    <div className="h-full min-h-0 flex-1 p-3 md:p-6 flex flex-col gap-3">
      <AllBuildsHeader />
      <BuildsTable />
    </div>
  )
}
