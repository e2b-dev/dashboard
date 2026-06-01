'use client'

import { useQuery } from '@tanstack/react-query'
import { type ReactElement, useEffect, useId, useMemo, useState } from 'react'
import type { ListedBuildModel } from '@/core/modules/builds/models'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import { AlertIcon, BuildIcon, SearchIcon } from '@/ui/primitives/icons'
import { RadioGroup } from '@/ui/primitives/radio-group'
import { Skeleton } from '@/ui/primitives/skeleton'
import { isValidUuid } from './assign-dialog.helpers'
import { BuildPickerRow } from './build-picker-row'

type BuildsQueryResult = {
  data?: { data: ListedBuildModel[]; nextCursor: string | null }
  isPending: boolean
  isError: boolean
  refetch: () => void
}

export type BuildSelectionSource = 'default' | 'search'

const DEFAULT_LIMIT = 5
const PICKER_REGION_MIN_HEIGHT = 'min-h-[128px]'

interface BuildPickerProps {
  open: boolean
  teamSlug: string
  templateId: string
  currentBuildId?: string
  selectedBuildId: string | null
  onSelect: (buildId: string | null, source: BuildSelectionSource) => void
  disabled?: boolean
}

export default function BuildPicker({
  open,
  teamSlug,
  templateId,
  currentBuildId,
  selectedBuildId,
  onSelect,
  disabled,
}: BuildPickerProps) {
  const trpc = useTRPC()
  const [searchValue, setSearchValue] = useState('')
  const debouncedSearch = useDebouncedValue(searchValue.trim(), 300)
  const isUuid = isValidUuid(debouncedSearch)

  // Fetch one extra so we can still show DEFAULT_LIMIT rows after filtering out
  // the currently-assigned build.
  const defaultQuery = useQuery(
    trpc.builds.list.queryOptions(
      {
        teamSlug,
        buildIdOrTemplate: templateId,
        statuses: ['success'],
        limit: DEFAULT_LIMIT + 1,
      },
      {
        enabled: open,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      }
    )
  )

  const searchQuery = useQuery(
    trpc.builds.list.queryOptions(
      {
        teamSlug,
        buildIdOrTemplate: debouncedSearch,
        statuses: ['success'],
        limit: 1,
      },
      {
        enabled: open && isUuid,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: false,
      }
    )
  )

  const isSearchMode = debouncedSearch.length > 0 && isUuid

  const defaultBuilds = useMemo(() => {
    const all = defaultQuery.data?.data ?? []
    const filtered = currentBuildId
      ? all.filter((b) => b.id !== currentBuildId)
      : all
    return filtered.slice(0, DEFAULT_LIMIT)
  }, [defaultQuery.data, currentBuildId])

  const searchResult = useMemo(() => {
    if (!isSearchMode) return null
    const build = searchQuery.data?.data[0]
    if (!build) return { kind: 'not-found' as const }
    if (build.templateId !== templateId) return { kind: 'not-found' as const }
    if (currentBuildId && build.id === currentBuildId) {
      return { kind: 'already-assigned' as const, build }
    }
    return { kind: 'found' as const, build }
  }, [isSearchMode, searchQuery.data, templateId, currentBuildId])

  // Drop selection when the selected build is no longer renderable.
  useEffect(() => {
    if (!selectedBuildId) return
    if (isSearchMode) {
      if (
        searchResult?.kind === 'found' &&
        searchResult.build.id === selectedBuildId
      ) {
        return
      }
      onSelect(null, 'search')
      return
    }
    if (!defaultBuilds.some((b) => b.id === selectedBuildId)) {
      onSelect(null, 'default')
    }
  }, [selectedBuildId, isSearchMode, searchResult, defaultBuilds, onSelect])

  return (
    <div className="flex flex-col gap-1.5">
      <BuildSearchInput
        value={searchValue}
        onChange={setSearchValue}
        disabled={disabled}
      />

      <div className={cn('flex flex-col', PICKER_REGION_MIN_HEIGHT)}>
        <PickerBody
          isSearchMode={isSearchMode}
          defaultQuery={defaultQuery}
          searchQuery={searchQuery}
          searchResult={searchResult}
          defaultBuilds={defaultBuilds}
          selectedBuildId={selectedBuildId}
          onSelect={onSelect}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

interface PickerBodyProps {
  isSearchMode: boolean
  defaultQuery: BuildsQueryResult
  searchQuery: BuildsQueryResult
  searchResult:
    | { kind: 'found'; build: ListedBuildModel }
    | { kind: 'already-assigned'; build: ListedBuildModel }
    | { kind: 'not-found' }
    | null
  defaultBuilds: ListedBuildModel[]
  selectedBuildId: string | null
  onSelect: (buildId: string | null, source: BuildSelectionSource) => void
  disabled?: boolean
}

function PickerBody({
  isSearchMode,
  defaultQuery,
  searchQuery,
  searchResult,
  defaultBuilds,
  selectedBuildId,
  onSelect,
  disabled,
}: PickerBodyProps) {
  if (isSearchMode) {
    if (searchQuery.isPending) {
      return <SkeletonRows count={1} />
    }
    if (searchQuery.isError) {
      return (
        <PickerMessage
          icon={<AlertIcon className="size-5 text-accent-error-highlight" />}
          title="Failed to look up build."
          action={
            <Button variant="secondary" onClick={() => searchQuery.refetch()}>
              Retry
            </Button>
          }
        />
      )
    }
    if (!searchResult || searchResult.kind === 'not-found') {
      return (
        <PickerMessage
          icon={<SearchIcon className="size-5 text-fg-tertiary" />}
          title="No build found"
        />
      )
    }
    if (searchResult.kind === 'already-assigned') {
      return <AlreadyAssignedMessage />
    }
    return (
      <RadioGroup
        value={selectedBuildId ?? ''}
        onValueChange={(value) => onSelect(value || null, 'search')}
        className="flex flex-col gap-1"
        aria-label="Build search result"
      >
        <BuildPickerRow
          buildId={searchResult.build.id}
          createdAt={searchResult.build.createdAt}
          disabled={disabled}
        />
      </RadioGroup>
    )
  }

  if (defaultQuery.isPending) {
    return <SkeletonRows count={DEFAULT_LIMIT} />
  }
  if (defaultQuery.isError) {
    return (
      <PickerMessage
        icon={<AlertIcon className="size-5 text-accent-error-highlight" />}
        title="Failed to load builds."
        action={
          <Button variant="secondary" onClick={() => defaultQuery.refetch()}>
            Retry
          </Button>
        }
      />
    )
  }
  if (defaultBuilds.length === 0) {
    return (
      <PickerMessage
        icon={<BuildIcon className="size-5 text-fg-tertiary" />}
        title="No ready builds yet"
        description="Latest successful builds appear here."
      />
    )
  }
  return (
    <RadioGroup
      value={selectedBuildId ?? ''}
      onValueChange={(value) => onSelect(value || null, 'default')}
      className="flex flex-col gap-0.5"
      aria-label="Recent ready builds"
    >
      {defaultBuilds.map((build) => (
        <BuildPickerRow
          key={build.id}
          buildId={build.id}
          createdAt={build.createdAt}
          disabled={disabled}
        />
      ))}
    </RadioGroup>
  )
}

interface BuildSearchInputProps {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}

function BuildSearchInput({
  value,
  onChange,
  disabled,
}: BuildSearchInputProps) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex h-9 w-full min-w-0 items-center gap-2 border bg-transparent px-3',
        'transition-colors anim-ease-appear anim-duration-fast',
        'hover:border-stroke-active',
        'focus-within:border-stroke-active focus-within:bg-bg-highlight'
      )}
    >
      <SearchIcon className="size-4 shrink-0 text-fg-tertiary" />
      <input
        id={id}
        type="text"
        aria-label="Search by build ID"
        placeholder="Build ID"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="prose-body min-w-0 flex-1 bg-transparent font-mono outline-none placeholder:font-sans placeholder:text-fg-tertiary"
      />
    </label>
  )
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <ul className="flex flex-col gap-1 pt-0.5" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={`skeleton-${i}`} className="flex items-center gap-3">
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="ml-auto h-4 w-14" />
        </li>
      ))}
    </ul>
  )
}

interface PickerMessageProps {
  icon: ReactElement
  title: string
  description?: string
  action?: ReactElement
}

function AlreadyAssignedMessage() {
  return (
    <output className="flex flex-1 flex-col items-start justify-start pt-0.5 text-start">
      <p className="prose-body-regular text-fg-tertiary">
        Already assigned to this tag
      </p>
    </output>
  )
}

function PickerMessage({
  icon,
  title,
  description,
  action,
}: PickerMessageProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4 pt-3 text-center">
      {icon}
      <p className="prose-body-highlight text-fg">{title}</p>
      {description ? (
        <p className="prose-body max-w-64 text-fg-tertiary text-balance">
          {description}
        </p>
      ) : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}
