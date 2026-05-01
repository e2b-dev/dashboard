import type { FC, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'

interface MemberTableProps {
  children: ReactNode
  className?: string
}

export const MemberTable: FC<MemberTableProps> = ({ children, className }) => (
  <Table className={cn('w-full table-fixed', className)}>
    <colgroup>
      <col className="w-[220px] lg:w-auto" />
      <col className="w-[96px] lg:w-[200px]" />
      <col className="w-[112px] lg:w-[220px]" />
    </colgroup>
    <TableHeader className="border-b-0">
      <TableRow className="border-stroke/80 hover:bg-transparent">
        <TableHead className="text-fg-tertiary font-sans! normal-case!">
          NAME
        </TableHead>
        <TableHead className="text-fg-tertiary font-sans! normal-case!">
          PROVIDERS
        </TableHead>
        <TableHead className="text-fg-tertiary font-sans! normal-case!">
          ADDED
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>{children}</TableBody>
  </Table>
)
