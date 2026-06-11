'use client'

import type { FC, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SearchIcon, VaultIcon } from '@/ui/primitives/icons'
import {
  Table,
  TableBody,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableLoadingState,
  TableRow,
} from '@/ui/primitives/table'
import { SecretsTableRow } from './secrets-table-row'
import type { Secret } from './types'

const SecretsTableHead = ({ children }: { children: ReactNode }) => (
  <TableHead className="h-auto pt-0 pb-2 align-top text-fg-tertiary font-sans! normal-case!">
    {children}
  </TableHead>
)

interface SecretsTableProps {
  secrets: Secret[]
  totalSecretCount: number
  isLoading?: boolean
  className?: string
}

export const SecretsTable: FC<SecretsTableProps> = ({
  secrets,
  totalSecretCount,
  isLoading = false,
  className,
}) => {
  const hasNoSecrets = totalSecretCount === 0

  return (
    <Table className={cn('w-full table-fixed', className)}>
      <colgroup>
        <col className="min-w-[220px]" />
        <col className="w-[135px]" />
        <col className="w-[153px]" />
        <col className="w-[168px]" />
      </colgroup>
      <TableHeader className="border-b-0">
        <TableRow className="hover:bg-transparent">
          <SecretsTableHead>LABEL</SecretsTableHead>
          <SecretsTableHead>ID</SecretsTableHead>
          <SecretsTableHead>ALLOWED FOR</SecretsTableHead>
          <SecretsTableHead>ADDED</SecretsTableHead>
        </TableRow>
      </TableHeader>
      <TableBody
        className={cn(
          secrets.length > 0 && [
            '[&_tr]:border-stroke',
            '[&_tr:last-child]:border-b [&_tr:last-child]:border-stroke',
          ]
        )}
      >
        {isLoading ? (
          <TableLoadingState colSpan={4} label="Loading secrets" />
        ) : secrets.length === 0 ? (
          <TableEmptyState colSpan={4}>
            <SearchIcon aria-hidden className={cn('size-4 shrink-0')} />
            {hasNoSecrets ? 'No secrets added yet' : 'No matching results'}
          </TableEmptyState>
        ) : (
          secrets.map((secret) => (
            <SecretsTableRow key={secret.id} secret={secret} />
          ))
        )}
      </TableBody>
    </Table>
  )
}
