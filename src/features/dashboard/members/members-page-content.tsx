'use client'

import { useMemo, useState } from 'react'
import type { TeamMember } from '@/core/modules/teams/models'
import { cn } from '@/lib/utils'
import { pluralize } from '@/lib/utils/formatting'
import { SearchIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { AddMemberDialog } from './add-member-dialog'
import MemberTable from './member-table'

interface MembersPageContentProps {
  members: TeamMember[]
  className?: string
}

const MembersPageContent = ({
  members,
  className,
}: MembersPageContentProps) => {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members

    return members.filter((m) => {
      const name = (m.info.name ?? '').toLowerCase()
      const email = m.info.email.toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [members, query])

  const totalLabel = `${members.length} ${pluralize(members.length, 'member')} total`

  return (
    <div className={cn('flex w-full flex-col gap-6', className)}>
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

      <div className="text-fg-tertiary flex flex-col gap-1 text-sm lg:flex-row lg:items-center lg:justify-between">
        <p>All members have the same roles & permissions</p>
        <p className="shrink-0">{totalLabel}</p>
      </div>

      <div className="bg-bg w-full overflow-x-auto">
        <MemberTable
          allMembers={members}
          members={filtered}
          totalMemberCount={members.length}
        />
      </div>
    </div>
  )
}

export default MembersPageContent
