import { Loader } from '@/ui/primitives/loader'
import { TableCell, TableRow } from '@/ui/primitives/table'

interface TableLoaderProps {
  colSpan?: number
}

export function TableLoader({ colSpan = 100 }: TableLoaderProps) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="h-48 text-center items-center justify-center flex"
      >
        <Loader />
      </TableCell>
    </TableRow>
  )
}
