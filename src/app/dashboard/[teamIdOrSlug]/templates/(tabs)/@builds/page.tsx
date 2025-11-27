import BuildsHeader from '@/features/dashboard/templates/builds/header'
import BuildsTable from '@/features/dashboard/templates/builds/table'

export default function BuildsPage() {
  return (
    <div className="h-full min-h-0 flex-1 p-3 md:p-6 flex flex-col gap-3">
      <BuildsHeader />
      <BuildsTable />
    </div>
  )
}
