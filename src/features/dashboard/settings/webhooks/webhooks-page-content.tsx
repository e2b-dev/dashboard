'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Suspense, useMemo, useState } from 'react'
import { useDashboard } from '@/features/dashboard/context'
import { cn } from '@/lib/utils'
import { pluralize } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { CatchErrorBoundary } from '@/ui/error'
import { Button } from '@/ui/primitives/button'
import { AddIcon, SearchIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { Skeleton } from '@/ui/primitives/skeleton'
import { WebhooksTable } from './table'
import { UpsertWebhookDialog } from './upsert-webhook-dialog'

const useWebhooksQuery = () => {
  const { team } = useDashboard()
  const trpc = useTRPC()
  return useSuspenseQuery(
    trpc.webhooks.list.queryOptions({ teamSlug: team.slug })
  )
}

interface WebhooksSearchFieldProps {
  value: string
  onChange: (next: string) => void
}

const WebhooksSearchFieldShell = ({
  value,
  onChange,
  placeholder,
  disabled,
}: WebhooksSearchFieldProps & { placeholder: string; disabled?: boolean }) => (
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
      disabled={disabled}
    />
  </div>
)

const WebhooksSearchField = ({ value, onChange }: WebhooksSearchFieldProps) => {
  const { data } = useWebhooksQuery()
  const count = data.webhooks.length
  const placeholder =
    count === 0
      ? 'Add a webhook to start searching'
      : 'Search by name, URL, or event'

  return (
    <WebhooksSearchFieldShell
      onChange={onChange}
      placeholder={placeholder}
      value={value}
    />
  )
}

interface WebhooksTotalLabelProps {
  query: string
}

const WebhooksTotalLabel = ({ query }: WebhooksTotalLabelProps) => {
  const { data } = useWebhooksQuery()
  const { webhooks } = data
  const totalCount = webhooks.length
  const hasActiveSearch = query.trim().length > 0
  const filteredCount = hasActiveSearch
    ? webhooks.filter(({ events, name, url }) =>
        [name, url, ...events].some((value) =>
          value.toLowerCase().includes(query.trim().toLowerCase())
        )
      ).length
    : totalCount

  if (totalCount === 0) return null

  const label = hasActiveSearch
    ? `Showing ${filteredCount} of ${totalCount} ${pluralize(totalCount, 'webhook')}`
    : `${totalCount} ${pluralize(totalCount, 'webhook')} in total`

  return <p className="shrink-0 lg:text-right">{label}</p>
}

const WebhooksTableContent = ({ query }: { query: string }) => {
  const { data } = useWebhooksQuery()
  const { webhooks } = data
  const normalizedQuery = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!normalizedQuery) return webhooks
    return webhooks.filter(({ events, name, url }) =>
      [name, url, ...events].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    )
  }, [normalizedQuery, webhooks])

  return (
    <WebhooksTable totalWebhookCount={webhooks.length} webhooks={filtered} />
  )
}

interface WebhooksPageContentProps {
  className?: string
}

export const WebhooksPageContent = ({
  className,
}: WebhooksPageContentProps) => {
  const [query, setQuery] = useState('')

  return (
    <div className={cn('flex w-full flex-col gap-6', className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Suspense
          fallback={
            <WebhooksSearchFieldShell
              onChange={setQuery}
              placeholder="Search by name, URL, or event"
              value={query}
            />
          }
        >
          <WebhooksSearchField onChange={setQuery} value={query} />
        </Suspense>

        <UpsertWebhookDialog mode="create">
          <Button
            className="w-full font-sans normal-case prose-body-highlight md:w-auto md:self-start"
            type="button"
            variant="primary"
          >
            <AddIcon aria-hidden className="size-4" />
            Add a webhook
          </Button>
        </UpsertWebhookDialog>
      </div>

      <CatchErrorBoundary classNames={{ wrapper: 'w-full' }}>
        <div className="text-fg-tertiary flex flex-col gap-1 text-sm lg:flex-row lg:items-start lg:justify-between">
          <p className="max-w-[520px] leading-[17px] tracking-[-0.16px]">
            Receive POST requests to your URLs when sandbox lifecycle events
            occur.
          </p>
          <Suspense fallback={<Skeleton className="h-4 w-24 border-0" />}>
            <WebhooksTotalLabel query={query} />
          </Suspense>
        </div>

        <div className="bg-bg -mx-3 overflow-x-auto px-3">
          <Suspense
            fallback={
              <WebhooksTable isLoading totalWebhookCount={0} webhooks={[]} />
            }
          >
            <WebhooksTableContent query={query} />
          </Suspense>
        </div>
      </CatchErrorBoundary>
    </div>
  )
}
