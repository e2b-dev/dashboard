'use client'

import type { FC } from 'react'
import type { TeamAPIKey } from '@/core/modules/keys/models'
import { cn } from '@/lib/utils'
import { KeyIcon } from '@/ui/primitives/icons'
import {
  Table,
  TableBody,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import { ApiKeysTableRow } from './api-keys-table-row'

interface ApiKeysTableProps {
  apiKeys: TeamAPIKey[]
  teamSlug: string
  totalKeyCount: number
  className?: string
}

export const ApiKeysTable: FC<ApiKeysTableProps> = ({
  apiKeys,
  teamSlug,
  totalKeyCount,
  className,
}) => (
  <Table className={cn('w-full table-fixed', className)}>
    <colgroup>
      <col className="min-w-[260px] lg:w-[44%]" />
      <col className="w-[132px] lg:w-[16%]" />
      <col className="w-[96px] lg:w-[12%]" />
      <col className="min-w-[188px] lg:w-[28%]" />
    </colgroup>
    <TableHeader className="border-b-0">
      <TableRow className="border-stroke/80 hover:bg-transparent">
        <TableHead className="text-fg-tertiary font-sans! normal-case!">
          LABEL
        </TableHead>
        <TableHead className="text-fg-tertiary font-sans! normal-case!">
          ID
        </TableHead>
        <TableHead className="text-fg-tertiary font-sans! normal-case!">
          LAST USED
        </TableHead>
        <TableHead className="text-fg-tertiary font-sans! normal-case!">
          ADDED
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {apiKeys.length === 0 ? (
        <TableEmptyState colSpan={4}>
          <KeyIcon
            aria-hidden
            className="size-4 shrink-0 opacity-80 text-fg-tertiary"
          />
          {totalKeyCount === 0
            ? 'No keys added yet'
            : 'No keys match your search.'}
        </TableEmptyState>
      ) : (
        apiKeys.map((apiKey) => (
          <ApiKeysTableRow
            key={apiKey.id}
            apiKey={apiKey}
            teamSlug={teamSlug}
          />
        ))
      )}
    </TableBody>
  </Table>
)
