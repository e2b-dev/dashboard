'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Suspense, useMemo, useState } from 'react'
import { useDashboard } from '@/features/dashboard/context'
import { cn } from '@/lib/utils'
import { pluralize } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { CatchErrorBoundary } from '@/ui/error'
import { Card, CardContent } from '@/ui/primitives/card'
import { SearchIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { Skeleton } from '@/ui/primitives/skeleton'
import { TableEmptyState, TableLoadingState } from '@/ui/primitives/table'
import { AddMemberDialog } from './add-member-dialog'
import { MemberTable } from './member-table'
import { getAddedByMember } from './member-table.utils'
import { MemberTableRow } from './member-table-row'

const useMembersQuery = () => {
  const { team } = useDashboard()
  const trpc = useTRPC()
  return useSuspenseQuery(
    trpc.teams.members.queryOptions({ teamSlug: team.slug })
  )
}

const MembersTotal = () => {
  const { data: members } = useMembersQuery()
  return (
    <p className="shrink-0">
      {members.length} {pluralize(members.length, 'member')} total
    </p>
  )
}

const MembersTableRows = ({ query }: { query: string }) => {
  const { data: members } = useMembersQuery()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members

    return members.filter((m) => {
      const name = (m.info.name ?? '').toLowerCase()
      const email = m.info.email.toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [members, query])

  if (filtered.length === 0) {
    return (
      <TableEmptyState colSpan={3}>
        <p className="prose-body-highlight text-fg-tertiary">
          {members.length === 0
            ? 'No team members found.'
            : 'No members match your search.'}
        </p>
      </TableEmptyState>
    )
  }

  return filtered.map((member) => (
    <MemberTableRow
      addedByMember={getAddedByMember(members, member.relation.added_by)}
      key={member.info.id}
      member={member}
    />
  ))
}

interface MembersPageContentProps {
  className?: string
}

export const MembersPageContent = ({ className }: MembersPageContentProps) => {
  const [query, setQuery] = useState('')

  return (
    <Card>
      <CardContent className={cn('flex w-full flex-col gap-6 p-0', className)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-[280px]">
            <SearchIcon
              aria-hidden
              className="text-fg-tertiary pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2"
            />
            <Input
              aria-label="Search by name or email"
              className="h-9 border-stroke pl-9 font-sans"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              type="search"
              value={query}
            />
          </div>
          <AddMemberDialog />
        </div>

        <CatchErrorBoundary classNames={{ wrapper: 'w-full' }}>
          <div className="text-fg-tertiary flex flex-col gap-1 text-sm lg:flex-row lg:items-center lg:justify-between">
            <p>All members have the same roles & permissions</p>
            <Suspense fallback={<Skeleton className="h-4 w-24 border-0" />}>
              <MembersTotal />
            </Suspense>
          </div>

          <div className="bg-bg w-full overflow-x-auto">
            <MemberTable>
              <Suspense
                fallback={
                  <TableLoadingState colSpan={3} label="Loading members" />
                }
              >
                <MembersTableRows query={query} />
              </Suspense>
            </MemberTable>
          </div>
        </CatchErrorBoundary>
      </CardContent>
    </Card>
  )
}
