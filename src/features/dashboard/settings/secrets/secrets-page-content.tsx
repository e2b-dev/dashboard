'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { pluralize } from '@/lib/utils/formatting'
import { CatchErrorBoundary } from '@/ui/error'
import { Button } from '@/ui/primitives/button'
import { AddIcon, SearchIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import {
  SECRETS_HELPER_COPY,
  SECRETS_SEARCH_PLACEHOLDER,
  SECRETS_SEARCH_PLACEHOLDER_EMPTY,
} from './constants'
import { SecretsTable } from './table'
import type { Secret } from './types'

// tRPC list query lands with the BE ticket; until then the page renders empty.
// Hoisted so the reference is stable across renders.
const PLACEHOLDER_SECRETS: readonly Secret[] = []

interface SecretsPageContentProps {
  className?: string
}

export const SecretsPageContent = ({ className }: SecretsPageContentProps) => {
  const [query, setQuery] = useState('')

  const secrets = PLACEHOLDER_SECRETS
  const normalizedQuery = query.trim().toLowerCase()
  const filteredSecrets = useMemo(() => {
    if (!normalizedQuery) return secrets
    return secrets.filter(({ label, allowList }) => {
      const haystack = [
        label,
        ...(allowList.mode === 'specific' ? allowList.hosts : []),
      ]
      return haystack.some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [normalizedQuery])

  const totalCount = secrets.length
  const hasActiveSearch = normalizedQuery.length > 0
  const searchPlaceholder =
    totalCount === 0
      ? SECRETS_SEARCH_PLACEHOLDER_EMPTY
      : SECRETS_SEARCH_PLACEHOLDER

  const totalLabel =
    totalCount === 0
      ? null
      : hasActiveSearch
        ? `Showing ${filteredSecrets.length} of ${totalCount} ${pluralize(totalCount, 'secret')}`
        : `${totalCount} ${pluralize(totalCount, 'secret')} in total`

  return (
    <div className={cn('flex w-full flex-col gap-6', className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-[280px] md:max-w-none md:shrink-0">
          <SearchIcon
            aria-hidden
            className="text-fg-tertiary pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2"
          />
          <Input
            aria-label={searchPlaceholder}
            className="h-9 border-stroke pl-9 font-sans"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            type="search"
            value={query}
          />
        </div>

        {/* TODO(secrets-dialog): wire to NewSecretDialog in the next commit. */}
        <Button
          className="w-full font-sans normal-case prose-body-highlight md:w-auto md:self-start"
          type="button"
          variant="primary"
        >
          <AddIcon aria-hidden className="size-4" />
          Add a secret
        </Button>
      </div>

      <CatchErrorBoundary classNames={{ wrapper: 'w-full' }}>
        <div className="text-fg-tertiary flex flex-col gap-1 text-sm lg:flex-row lg:items-start lg:justify-between">
          <p className="max-w-[520px] leading-[17px] tracking-[-0.16px]">
            {SECRETS_HELPER_COPY}
          </p>
          {totalLabel ? (
            <p className="shrink-0 lg:text-right">{totalLabel}</p>
          ) : null}
        </div>

        <div className="bg-bg w-full overflow-x-auto">
          <SecretsTable
            secrets={filteredSecrets}
            totalSecretCount={totalCount}
          />
        </div>
      </CatchErrorBoundary>
    </div>
  )
}
