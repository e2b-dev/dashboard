'use client'

import type { FC } from 'react'
import type { TeamMember } from '@/core/modules/teams/models'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import { getAddedByMember } from './member-table.utils'
import MemberTableRow from './member-table-row'

interface MemberTableProps {
  allMembers: TeamMember[]
  members: TeamMember[]
  /** Full list length before client-side search filter (for empty copy). */
  totalMemberCount: number
  className?: string
}

const MemberTable: FC<MemberTableProps> = ({
  allMembers,
  members,
  totalMemberCount,
  className,
}) => (
  <Table className={cn('w-full table-fixed', className)}>
    <colgroup>
      <col />
      <col className="w-[96px] md:w-[200px]" />
      <col className="w-[112px] md:w-[220px]" />
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
    <TableBody>
      {members.length === 0 ? (
        <TableRow>
          <TableCell className="text-fg-tertiary p-6 text-center" colSpan={3}>
            {totalMemberCount === 0
              ? 'No team members found.'
              : 'No members match your search.'}
          </TableCell>
        </TableRow>
      ) : (
        members.map((member) => (
          <MemberTableRow
            addedByMember={getAddedByMember(
              allMembers,
              member.relation.added_by
            )}
            key={member.info.id}
            member={member}
          />
        ))
      )}
    </TableBody>
  </Table>
)

export default MemberTable
