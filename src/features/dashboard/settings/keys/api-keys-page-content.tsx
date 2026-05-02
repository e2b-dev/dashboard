'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { CLI_GENERATED_KEY_NAME } from '@/configs/api'
import { cn } from '@/lib/utils'
import { pluralize } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { ErrorIndicator } from '@/ui/error-indicator'
import { SearchIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { Loader } from '@/ui/primitives/loader'
import { ApiKeysTable } from './api-keys-table'
import { matchesApiKeySearch } from './api-keys-utils'
import { CreateApiKeyDialog } from './create-api-key-dialog'

interface ApiKeysPageContentProps {
  teamSlug: string
  className?: string
}

interface ApiKeysSearchFieldProps {
  value: string
  onChange: (next: string) => void
  count: number
}

const ApiKeysSearchField = ({
  value,
  onChange,
  count,
}: ApiKeysSearchFieldProps) => {
  const placeholder =
    count === 0 ? 'Add an API key to start searching' : 'Search by title or ID'

  return (
    <div className="relative w-full md:w-[280px] md:max-w-none md:shrink-0">
      <SearchIcon
        aria-hidden
        className="text-fg-tertiary pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2"
      />
      <Input
        aria-label={placeholder}
        className="h-9 border-stroke pl-9 font-sans"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </div>
  )
}

interface ApiKeysTotalLabelProps {
  totalCount: number
  filteredCount: number
  hasActiveSearch: boolean
}

const ApiKeysTotalLabel = ({
  totalCount,
  filteredCount,
  hasActiveSearch,
}: ApiKeysTotalLabelProps) => {
  if (totalCount === 0) return null

  const label = hasActiveSearch
    ? `Showing ${filteredCount} of ${totalCount} ${pluralize(totalCount, 'key')}`
    : `${totalCount} ${pluralize(totalCount, 'key')} in total`

  return <p className="shrink-0 lg:text-right">{label}</p>
}

export const ApiKeysPageContent = ({
  teamSlug,
  className,
}: ApiKeysPageContentProps) => {
  const trpc = useTRPC()
  const [query, setQuery] = useState('')
  const hasActiveSearch = query.trim().length > 0

  const { data, isLoading, isError, error } = useQuery(
    trpc.teams.listApiKeys.queryOptions({ teamSlug })
  )

  const apiKeys = data?.apiKeys ?? []

  const sortedKeys = useMemo(() => {
    const normal = apiKeys.filter((k) => k.name !== CLI_GENERATED_KEY_NAME)
    const cli = apiKeys.filter((k) => k.name === CLI_GENERATED_KEY_NAME)
    return [...normal, ...cli]
  }, [apiKeys])

  const filtered = useMemo(() => {
    return sortedKeys.filter((k) => matchesApiKeySearch(k, query))
  }, [sortedKeys, query])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader variant="square" size="lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorIndicator
        className="bg-bg w-full max-w-full"
        description="Could not load API keys"
        message={error?.message ?? 'Unknown error'}
      />
    )
  }

  return (
    <div className={cn('flex w-full flex-col gap-6', className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <ApiKeysSearchField
          count={apiKeys.length}
          onChange={setQuery}
          value={query}
        />
        <CreateApiKeyDialog teamSlug={teamSlug} />
      </div>

      <div className="text-fg-tertiary flex flex-col gap-1 text-sm lg:flex-row lg:items-start lg:justify-between">
        <p className="max-w-[520px] leading-[17px] tracking-[-0.16px]">
          These keys authenticate API requests from your team&apos;s
          applications.
        </p>
        <ApiKeysTotalLabel
          filteredCount={filtered.length}
          hasActiveSearch={hasActiveSearch}
          totalCount={apiKeys.length}
        />
      </div>

      <div className="bg-bg w-full overflow-x-auto">
        <ApiKeysTable
          apiKeys={filtered}
          teamSlug={teamSlug}
          totalKeyCount={apiKeys.length}
        />
      </div>
    </div>
  )
}
