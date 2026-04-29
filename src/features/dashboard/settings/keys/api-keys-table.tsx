'use client'

import type { FC, ReactNode } from 'react'
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

const ApiKeysTableHead = ({ children }: { children: ReactNode }) => (
  <TableHead className="h-auto pt-0 pb-2 align-top text-fg-tertiary font-sans! normal-case!">
    {children}
  </TableHead>
)

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
}) => {
  const hasNoKeys = totalKeyCount === 0

  return (
    <Table className={cn('w-full table-fixed', className)}>
      <colgroup>
        <col className="min-w-[260px] lg:w-[48%]" />
        <col className="w-[132px] lg:w-[16%]" />
        <col className="w-[96px] lg:w-[12%]" />
        <col className="w-[180px] lg:w-[24%]" />
      </colgroup>
      <TableHeader className="border-b-0">
        <TableRow className="hover:bg-transparent">
          <ApiKeysTableHead>LABEL</ApiKeysTableHead>
          <ApiKeysTableHead>ID</ApiKeysTableHead>
          <ApiKeysTableHead>LAST USED</ApiKeysTableHead>
          <ApiKeysTableHead>ADDED</ApiKeysTableHead>
        </TableRow>
      </TableHeader>
      <TableBody
        className={cn(
          apiKeys.length > 0 && [
            '[&_tr]:border-stroke',
            '[&_tr:last-child]:border-b [&_tr:last-child]:border-stroke',
          ]
        )}
      >
        {apiKeys.length === 0 ? (
          <TableEmptyState colSpan={4}>
            <KeyIcon
              aria-hidden
              className={cn(
                'size-4 shrink-0',
                hasNoKeys ? 'text-fg' : 'opacity-80 text-fg-tertiary'
              )}
            />
            {hasNoKeys ? 'No keys added yet' : 'No keys match your search.'}
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
}
