'use client'

import { SearchIcon } from '@/ui/primitives/icons'
import { DebouncedInput } from '@/ui/primitives/input'
import { BuildsStatusFilter } from './status-filter'
import useTemplateBuildsFilters from './use-template-builds-filters'

/**
 * Toolbar for a single template's builds tab
 * (`/templates/[templateId]/builds`).
 *
 * Search input writes the `q` URL param, which is applied client-side
 * as a substring match on build IDs (the backend query stays scoped
 * by templateID). Status filter writes `statuses`.
 */
export function TemplateBuildsHeader() {
  const { statuses, setStatuses, q, setQ } = useTemplateBuildsFilters()

  return (
    <div className="flex sm:flex-row flex-col gap-1">
      <div className="relative w-full max-w-70">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-fg-tertiary pointer-events-none" />
        <DebouncedInput
          placeholder="Search by build ID"
          className="pl-[30px]"
          value={q ?? ''}
          onChange={(v) => setQ(String(v))}
          debounce={300}
        />
      </div>
      <BuildsStatusFilter statuses={statuses} onStatusesChange={setStatuses} />
    </div>
  )
}
