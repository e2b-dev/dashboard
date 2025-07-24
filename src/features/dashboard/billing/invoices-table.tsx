import { getInvoices } from '@/server/billing/get-invoices'
import { ErrorIndicator } from '@/ui/error-indicator'
import { Loader } from '@/ui/loader'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'
import { Button } from '@/ui/primitives/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import Link from 'next/link'
import { Suspense } from 'react'

interface BillingInvoicesTableProps {
  teamId: string
}

function LoadingFallback() {
  return (
    <TableRow>
      <TableCell colSpan={4} className="text-left">
        <Alert className="w-full text-left" variant="contrast2">
          <AlertTitle className="flex items-center gap-2">
            <Loader />
            Loading invoices...
          </AlertTitle>
          <AlertDescription>This may take a moment.</AlertDescription>
        </Alert>
      </TableCell>
    </TableRow>
  )
}

async function InvoicesTableContent({ teamId }: { teamId: string }) {
  const res = await getInvoices({ teamId })

  if (!res?.data || res.serverError || res.validationErrors) {
    return (
      <TableRow>
        <TableCell colSpan={4}>
          <ErrorIndicator
            description={'Could not load invoices'}
            message={res?.serverError || 'Unknown error'}
            className="bg-bg mt-2 w-full max-w-full"
          />
        </TableCell>
      </TableRow>
    )
  }

  const invoices = res.data

  if (!invoices?.length) {
    return (
      <TableRow>
        <TableCell colSpan={4} className="text-left">
          <Alert className="w-full text-left" variant="contrast1">
            <AlertTitle>No invoices found.</AlertTitle>
            <AlertDescription>Your team has no invoices yet.</AlertDescription>
          </Alert>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      {invoices.map((invoice) => (
        <TableRow key={invoice.url}>
          <TableCell>
            {new Date(invoice.date_created).toLocaleDateString()}
          </TableCell>
          <TableCell>${invoice.cost.toFixed(2)}</TableCell>
          <TableCell>{invoice.paid ? 'Paid' : 'Pending'}</TableCell>
          <TableCell className="text-right">
            <Button variant="muted" size="sm" asChild>
              <Link href={invoice.url} target="_blank">
                View Invoice
              </Link>
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export default function BillingInvoicesTable({
  teamId,
}: BillingInvoicesTableProps) {
  return (
    <Table className="animate-in fade-in w-full min-w-[800px]">
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <th></th>
        </TableRow>
      </TableHeader>
      <TableBody>
        <Suspense fallback={<LoadingFallback />}>
          <InvoicesTableContent teamId={teamId} />
        </Suspense>
      </TableBody>
    </Table>
  )
}
