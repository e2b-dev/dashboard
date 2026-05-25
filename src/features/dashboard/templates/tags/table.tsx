'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { TemplateTag } from '@/core/modules/templates/models'
import { useTRPC } from '@/trpc/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import TagsEmpty from './empty'
import TagsHeader from './header'
import { SortableHeader, type SortDir, type SortKey } from './sortable-header'
import { BuildLinkCell, TagPillCell } from './table-cells'

interface TagsTableProps {
  teamSlug: string
  templateId: string
}

export default function TagsTable({ teamSlug, templateId }: TagsTableProps) {
  const trpc = useTRPC()

  const { data } = useSuspenseQuery(
    trpc.templates.getTags.queryOptions(
      { teamSlug, templateId },
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      }
    )
  )

  const allTags = data.tags

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const visibleTags = useMemo<TemplateTag[]>(() => {
    const query = search.trim().toLowerCase()
    const filtered = query
      ? allTags.filter((t) => t.tag.toLowerCase().includes(query))
      : allTags

    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'tag') {
        cmp = a.tag.localeCompare(b.tag)
      } else {
        const aTime = new Date(a.createdAt).getTime()
        const bTime = new Date(b.createdAt).getTime()
        cmp = aTime - bTime
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [allTags, search, sortKey, sortDir])

  const handleSortChange = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'tag' ? 'asc' : 'desc')
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <TagsHeader
        search={search}
        onSearchChange={setSearch}
        totalCount={allTags.length}
        visibleCount={visibleTags.length}
      />

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
        <Table suppressHydrationWarning>
          <TableHeader className="sticky top-0 z-10 bg-bg">
            <TableRow>
              <TableHead className="w-1/3">
                <SortableHeader
                  label="Name"
                  sortKey="tag"
                  activeKey={sortKey}
                  dir={sortDir}
                  defaultDir="asc"
                  onChange={handleSortChange}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Assigned to"
                  sortKey="createdAt"
                  activeKey={sortKey}
                  dir={sortDir}
                  defaultDir="desc"
                  onChange={handleSortChange}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleTags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <TagsEmpty hasSearch={search.trim().length > 0} />
                </TableCell>
              </TableRow>
            ) : (
              visibleTags.map((t) => (
                <TableRow key={`${t.tag}-${t.buildID}`}>
                  <TableCell className="py-2">
                    <TagPillCell tag={t.tag} />
                  </TableCell>
                  <TableCell className="py-2">
                    <BuildLinkCell
                      teamSlug={teamSlug}
                      templateId={templateId}
                      buildId={t.buildID}
                      createdAt={t.createdAt}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
