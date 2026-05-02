'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Suspense, useMemo, useState } from 'react'
import { CLI_GENERATED_KEY_NAME } from '@/configs/api'
import { useDashboard } from '@/features/dashboard/context'
import { pluralize } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { CatchErrorBoundary } from '@/ui/error'
import { SearchIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { Skeleton } from '@/ui/primitives/skeleton'
import { ApiKeysTable } from './api-keys-table'
import { matchesApiKeySearch } from './api-keys-utils'
import { CreateApiKeyDialog } from './create-api-key-dialog'

const useApiKeysQuery = () => {
  const { team } = useDashboard()
  const trpc = useTRPC()
  return useSuspenseQuery(
    trpc.teams.listApiKeys.queryOptions({ teamSlug: team.slug })
  )
}

interface ApiKeysSearchFieldProps {
  value: string
  onChange: (next: string) => void
}

const ApiKeysSearchField = ({ value, onChange }: ApiKeysSearchFieldProps) => {
  const { data } = useApiKeysQuery()
  const count = data.apiKeys.length
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
  query: string
}

const ApiKeysTotalLabel = ({ query }: ApiKeysTotalLabelProps) => {
  const { data } = useApiKeysQuery()
  const { apiKeys } = data
  const totalCount = apiKeys.length
  const hasActiveSearch = query.trim().length > 0
  const filteredCount = hasActiveSearch
    ? apiKeys.filter((k) => matchesApiKeySearch(k, query)).length
    : totalCount

  if (totalCount === 0) return null

  const label = hasActiveSearch
    ? `Showing ${filteredCount} of ${totalCount} ${pluralize(totalCount, 'key')}`
    : `${totalCount} ${pluralize(totalCount, 'key')} in total`

  return <p className="shrink-0 lg:text-right">{label}</p>
}

const ApiKeysTableContent = ({ query }: { query: string }) => {
  const { data } = useApiKeysQuery()
  const { apiKeys } = data

  const sortedKeys = useMemo(() => {
    const normal = apiKeys.filter((k) => k.name !== CLI_GENERATED_KEY_NAME)
    const cli = apiKeys.filter((k) => k.name === CLI_GENERATED_KEY_NAME)
    return [...normal, ...cli]
  }, [apiKeys])

  const filtered = useMemo(() => {
    return sortedKeys.filter((k) => matchesApiKeySearch(k, query))
  }, [sortedKeys, query])

  return <ApiKeysTable apiKeys={filtered} totalKeyCount={apiKeys.length} />
}

export const ApiKeysPageContent = () => {
  const [query, setQuery] = useState('')

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CatchErrorBoundary
          hideFrame
          classNames={{
            wrapper: 'w-full md:w-[280px] md:max-w-none md:shrink-0',
          }}
        >
          <Suspense fallback={<Skeleton className="h-9 w-full" />}>
            <ApiKeysSearchField onChange={setQuery} value={query} />
          </Suspense>
        </CatchErrorBoundary>
        <CreateApiKeyDialog />
      </div>

      <CatchErrorBoundary classNames={{ wrapper: 'w-full' }}>
        <div className="text-fg-tertiary flex flex-col gap-1 text-sm lg:flex-row lg:items-start lg:justify-between">
          <p className="max-w-[520px] leading-[17px] tracking-[-0.16px]">
            These keys authenticate API requests from your team&apos;s
            applications.
          </p>
          <Suspense fallback={<Skeleton className="h-4 w-24 border-0" />}>
            <ApiKeysTotalLabel query={query} />
          </Suspense>
        </div>

        <div className="bg-bg w-full overflow-x-auto">
          <Suspense
            fallback={<ApiKeysTable apiKeys={[]} isLoading totalKeyCount={0} />}
          >
            <ApiKeysTableContent query={query} />
          </Suspense>
        </div>
      </CatchErrorBoundary>
    </div>
  )
}
