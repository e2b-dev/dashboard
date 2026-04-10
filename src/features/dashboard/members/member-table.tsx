'use client'

import type { FC } from 'react'
import type { TeamMember } from '@/core/modules/teams/models'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableLoadingState,
  TableRow,
} from '@/ui/primitives/table'
import { getAddedByMember } from './member-table.utils'
import { MemberTableRow } from './member-table-row'

interface MemberTableProps {
  allMembers: TeamMember[]
  isLoading?: boolean
  members: TeamMember[]
  totalMemberCount: number
  className?: string
}

const MemberTable: FC<MemberTableProps> = ({
  allMembers,
  isLoading = false,
  members,
  totalMemberCount,
  className,
}) => (
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
    <TableBody>
      {isLoading ? (
        <TableLoadingState colSpan={3} label="Loading members" />
      ) : members.length === 0 ? (
        <TableEmptyState colSpan={3}>
          <p className="prose-body-highlight text-fg-tertiary">
            {totalMemberCount === 0
              ? 'No team members found.'
              : 'No members match your search.'}
          </p>
        </TableEmptyState>
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
