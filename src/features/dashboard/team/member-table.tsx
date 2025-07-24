import { cn } from '@/lib/utils'
import { Loader } from '@/ui/loader'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import { FC, Suspense } from 'react'
import MemberTableBody from './member-table-body'

interface MemberTableProps {
  teamId: string
  className?: string
}

const MemberTable: FC<MemberTableProps> = ({ teamId, className }) => {
  return (
    <Table className={cn('min-w-[800px]', className)}>
      <TableHeader>
        <TableRow>
          <th className="w-[50px]"></th>
          <TableHead className="w-[200px]">Name</TableHead>
          <TableHead className="w-[250px]">E-Mail</TableHead>
          <TableHead className="w-[200px]">Added By</TableHead>
          <th className="w-[50px]"></th>
        </TableRow>
      </TableHeader>
      <TableBody>
        <Suspense
          fallback={
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-left">
                <Alert className="w-full text-left" variant="contrast2">
                  <AlertTitle className="flex items-center gap-2">
                    <Loader />
                    Loading members...
                  </AlertTitle>
                  <AlertDescription>This may take a moment.</AlertDescription>
                </Alert>
              </TableCell>
            </TableRow>
          }
        >
          <MemberTableBody teamId={teamId} />
        </Suspense>
      </TableBody>
    </Table>
  )
}

export default MemberTable
