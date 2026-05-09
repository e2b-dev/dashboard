import { Suspense } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import TemplatesTable from '@/features/dashboard/templates/list/table'

export default function TemplatesListPage() {
  return (
    <Suspense fallback={<LoadingLayout />}>
      <TemplatesTable />
    </Suspense>
  )
}
