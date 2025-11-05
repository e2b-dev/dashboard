import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import { TableLoader } from '@/ui/table-loader'
import { FC, Suspense } from 'react'
import TableBodyContent from './table-body'

interface ApiKeysTableProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
  className?: string
}

const ApiKeysTable: FC<ApiKeysTableProps> = ({ params, className }) => {
  return (
    <Table className={cn('w-full animate-in fade-in', className)}>
      <TableHeader>
        <TableRow>
          <TableHead className="text-left">Key</TableHead>
          <TableHead className="text-left">Last Used</TableHead>
          <TableHead className="text-right">Created By</TableHead>
          <TableHead className="text-right">Created At</TableHead>
          <th></th>
        </TableRow>
      </TableHeader>
      <TableBody>
        <Suspense fallback={<TableLoader colSpan={5} />}>
          <TableBodyContent params={params} />
        </Suspense>
      </TableBody>
    </Table>
  )
}

export default ApiKeysTable
