import { cn } from '@/lib/utils'
import { VaultIcon } from '@/ui/primitives/icons'
import {
  Table,
  TableBody,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableLoadingState,
  TableRow,
} from '@/ui/primitives/table'
import type { Secret } from './types'

interface SecretsTableProps {
  secrets: Secret[]
  totalSecretCount: number
  isLoading?: boolean
  className?: string
}

const headerCellClassName =
  'h-[17px] p-0 pb-2 align-top font-sans! text-[12px] leading-[17px] text-left font-normal text-fg-tertiary uppercase'

export const SecretsTable = ({
  secrets,
  totalSecretCount,
  isLoading = false,
  className,
}: SecretsTableProps) => {
  const hasNoSecrets = totalSecretCount === 0
  const emptyMessage = hasNoSecrets
    ? 'No secrets added yet'
    : 'No secrets match your search'

  return (
    <Table className={cn('w-full min-w-[720px] table-fixed', className)}>
      <colgroup>
        <col />
        <col className="w-[220px]" />
        <col className="w-[200px]" />
        <col className="w-[136px]" />
        <col className="w-10" />
      </colgroup>
      <TableHeader className="border-b-0">
        <TableRow className="border-0">
          <TableHead className={headerCellClassName}>LABEL</TableHead>
          <TableHead className={headerCellClassName}>ID</TableHead>
          <TableHead className={headerCellClassName}>ALLOWED FOR</TableHead>
          <TableHead className={headerCellClassName}>ADDED</TableHead>
          <TableHead className={headerCellClassName}>
            <span className="sr-only">Actions</span>
          </TableHead>
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
          <TableLoadingState colSpan={5} label="Loading secrets" />
        ) : (
          <TableEmptyState colSpan={5}>
            <VaultIcon
              aria-hidden
              className={cn(
                'size-4 shrink-0',
                hasNoSecrets ? 'text-fg' : 'text-fg-tertiary opacity-80'
              )}
            />
            <p className="prose-body-highlight text-fg">{emptyMessage}</p>
          </TableEmptyState>
        )}
      </TableBody>
    </Table>
  )
}
