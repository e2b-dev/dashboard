'use client'

import { useMemo, useState } from 'react'
import type { Webhook } from '@/features/dashboard/settings/webhooks/types'
import { cn } from '@/lib/utils'
import { pluralize } from '@/lib/utils/formatting'
import { Button } from '@/ui/primitives/button'
import { AddIcon, SearchIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import WebhookAddEditDialog from './add-edit-dialog'
import WebhooksTable from './table'

interface WebhooksPageContentProps {
  webhooks: Webhook[]
  hasError: boolean
  className?: string
}

interface WebhooksSearchFieldProps {
  value: string
  onChange: (next: string) => void
  count: number
}

const WebhooksSearchField = ({
  value,
  onChange,
  count,
}: WebhooksSearchFieldProps) => {
  const placeholder =
    count === 0
      ? 'Add a webhook to start searching'
      : 'Search by name, URL, or event'

  return (
    <div className="relative w-full md:w-[280px] md:max-w-none md:shrink-0">
      <SearchIcon
        aria-hidden
        className="text-fg-tertiary pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2"
      />
      <Input
        aria-label={placeholder}
        className="h-9 border-stroke pl-9 font-sans"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </div>
  )
}

interface WebhooksTotalLabelProps {
  totalCount: number
  filteredCount: number
  hasActiveSearch: boolean
}

const WebhooksTotalLabel = ({
  totalCount,
  filteredCount,
  hasActiveSearch,
}: WebhooksTotalLabelProps) => {
  if (totalCount === 0) return null

  const label = hasActiveSearch
    ? `Showing ${filteredCount} of ${totalCount} ${pluralize(totalCount, 'webhook')}`
    : `${totalCount} ${pluralize(totalCount, 'webhook')} in total`

  return <p className="shrink-0 lg:text-right">{label}</p>
}

export const WebhooksPageContent = ({
  webhooks,
  hasError,
  className,
}: WebhooksPageContentProps) => {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const hasActiveSearch = normalizedQuery.length > 0

  const filteredWebhooks = useMemo(() => {
    if (!normalizedQuery) return webhooks

    return webhooks.filter(({ events, name, url }) => {
      return [name, url, ...events].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [normalizedQuery, webhooks])

  return (
    <div className={cn('flex w-full flex-col gap-6', className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <WebhooksSearchField
          count={webhooks.length}
          onChange={setQuery}
          value={query}
        />

        <WebhookAddEditDialog mode="add">
          <Button
            className="w-full font-sans normal-case prose-body-highlight md:w-auto md:self-start"
            size="md"
            type="button"
            variant="default"
          >
            <AddIcon aria-hidden className="size-4" />
            Add a webhook
          </Button>
        </WebhookAddEditDialog>
      </div>

      <div className="text-fg-tertiary flex flex-col gap-1 text-sm lg:flex-row lg:items-start lg:justify-between">
        <p className="max-w-[520px] leading-[17px] tracking-[-0.16px]">
          Receive POST requests to your URLs when sandbox lifecycle events
          occur.
        </p>
        <WebhooksTotalLabel
          filteredCount={filteredWebhooks.length}
          hasActiveSearch={hasActiveSearch}
          totalCount={webhooks.length}
        />
      </div>

      <div className="bg-bg w-full overflow-x-auto">
        <WebhooksTable
          hasError={hasError}
          totalWebhookCount={webhooks.length}
          webhooks={filteredWebhooks}
        />
      </div>
    </div>
  )
}
