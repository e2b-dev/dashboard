'use client'

import { formatCurrency } from '@/lib/utils/formatting'
import { Label } from '@/ui/primitives/label'
import { Separator } from '@/ui/primitives/separator'
import { Skeleton } from '@/ui/primitives/skeleton'
import { useUsage } from './hooks'

export default function Credits() {
  const { credits, isLoading } = useUsage()

  return (
    <section>
      <Separator className="mb-3" />
      <div className="flex items-center gap-3 max-md:flex-col max-md:items-start">
        <Label className="prose-label text-fg-tertiary">Credits</Label>
        <div className="w-full">
          {isLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <span className="prose-value-small">
              {formatCurrency(credits ?? 0)}
            </span>
          )}
        </div>
        <p className="prose-body text-fg-tertiary whitespace-nowrap">
          Automatically applied to invoices. Subscription costs excluded.
        </p>
      </div>
      <Separator className="mt-3" />
    </section>
  )
}
