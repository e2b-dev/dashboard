'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/formatting'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  ArrowDownIcon,
  ExternalLinkIcon,
  InvoiceIcon,
} from '@/ui/primitives/icons'
import { Label } from '@/ui/primitives/label'
import { Loader } from '@/ui/primitives/loader'
import { Skeleton } from '@/ui/primitives/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import { useInvoices } from './hooks'
import { TableEmptyRowBorder } from './table-empty-row-border'

const COLUMN_WIDTHS = {
  date: 120,
  status: 96,
  actions: 80,
} as const

function colStyle(width: number) {
  return { width, minWidth: width, maxWidth: width }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface InvoicesEmptyProps {
  error?: string
}

function InvoicesEmpty({ error }: InvoicesEmptyProps) {
  return (
    <div className="w-full gap-2 relative flex flex-col justify-center items-center">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-11 w-full border border-bg-highlight relative flex items-center gap-2 justify-center overflow-hidden"
        >
          <TableEmptyRowBorder className="absolute bottom-0 left-0 rotate-180 opacity-99" />
          <TableEmptyRowBorder className="absolute bottom-0 right-0 opacity-99" />

          {index === 1 && (
            <>
              <InvoiceIcon
                className={cn('size-4', error && 'text-accent-error-highlight')}
              />

              <p
                className={cn(
                  'prose-body-highlight',
                  error && 'text-accent-error-highlight'
                )}
              >
                {error ? error : 'No invoices yet'}
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function InvoicesLoading() {
  return (
    <div className="w-full gap-2 relative flex flex-col justify-center items-center">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-11 w-full border border-bg-highlight relative flex items-center gap-4 justify-center overflow-hidden"
        >
          <Skeleton className="absolute inset-0" />

          {index === 1 && (
            <>
              <Loader variant="slash" className="z-10" />
              <span className="prose-body-highlight z-10">
                Loading invoices <Loader variant="dots" className="z-10" />
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export default function BillingInvoicesTable() {
  const { invoices, isLoading, error } = useInvoices()

  const hasData = invoices && invoices.length > 0
  const showLoader = isLoading && !hasData
  const showEmpty = !isLoading && !hasData

  return (
    <section className="flex flex-col gap-6">
      <Label className="prose-label text-fg-tertiary">Invoices</Label>

      <Table className="animate-in fade-in w-full">
        <colgroup>
          <col style={colStyle(COLUMN_WIDTHS.date)} />
          <col style={colStyle(COLUMN_WIDTHS.status)} />
          <col className="w-full" />
          <col style={colStyle(COLUMN_WIDTHS.actions)} />
        </colgroup>

        <TableHeader
          className={cn({ 'border-b-0 opacity-50': showEmpty || showLoader })}
        >
          <TableRow>
            <TableHead>
              <span className="inline-flex items-center gap-1 text-fg">
                Date
                <ArrowDownIcon className="size-3" />
              </span>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-end">Amount</TableHead>
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {showLoader && (
            <TableRow>
              <TableCell colSpan={4} className="p-0">
                <InvoicesLoading />
              </TableCell>
            </TableRow>
          )}

          {showEmpty && (
            <TableRow>
              <TableCell colSpan={4} className="p-0">
                <InvoicesEmpty error={error?.message} />
              </TableCell>
            </TableRow>
          )}

          {hasData &&
            invoices.map((invoice) => (
              <TableRow key={invoice.url} className="h-11">
                <TableCell className="py-0">
                  {formatDate(invoice.date_created)}
                </TableCell>
                <TableCell className="py-0">
                  <Badge variant={invoice.paid ? 'positive' : 'warning'}>
                    {invoice.paid ? '✓ Paid' : 'Pending'}
                  </Badge>
                </TableCell>
                <TableCell className="text-end py-0">
                  {invoice.credits_used > 0 && (
                    <span className="text-fg-tertiary line-through mr-2">
                      {formatCurrency(invoice.cost + invoice.credits_used)}
                    </span>
                  )}
                  {formatCurrency(invoice.cost)}
                </TableCell>
                <TableCell className="text-end py-0">
                  <Button variant="ghost" size="slate" asChild>
                    <Link href={invoice.url} target="_blank">
                      View
                      <ExternalLinkIcon className="size-3 text-fg-tertiary" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </section>
  )
}
