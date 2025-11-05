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

interface WebhooksTableProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
  className?: string
}

const WebhooksTable: FC<WebhooksTableProps> = ({ params, className }) => {
  return (
    <Table className={cn('w-full animate-in fade-in table-fixed', className)}>
      <TableHeader>
        <TableRow>
          <TableHead className="text-left w-[30%]">Name & URL</TableHead>
          <TableHead className="text-left w-[50%]">Events</TableHead>
          <TableHead className="text-right w-[15%]">Added</TableHead>
          <th className="w-[5%]"></th>
        </TableRow>
      </TableHeader>
      <TableBody>
        <Suspense fallback={<TableLoader colSpan={4} />}>
          <TableBodyContent params={params} />
        </Suspense>
      </TableBody>
    </Table>
  )
}

export default WebhooksTable
