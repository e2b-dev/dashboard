'use client'

import { SearchIcon } from '@/ui/primitives/icons'
import { DebouncedInput } from '@/ui/primitives/input'
import { BuildsStatusFilter } from './status-filter'
import useFilters from './use-filters'

/**
 * Toolbar for the all-team builds list (`/templates/builds`).
 *
 * Search input writes the `buildIdOrTemplate` URL param, which the
 * backend resolves against build IDs and template IDs/names. Status
 * filter writes `statuses`.
 */
export function AllBuildsHeader() {
  const { statuses, setStatuses, buildIdOrTemplate, setBuildIdOrTemplate } =
    useFilters()

  return (
    <div className="flex sm:flex-row flex-col gap-1">
      <div className="relative w-full max-w-70">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-fg-tertiary pointer-events-none" />
        <DebouncedInput
          placeholder="Build ID, Template ID or Name"
          className="pl-[30px]"
          value={buildIdOrTemplate ?? ''}
          onChange={(v) => setBuildIdOrTemplate(String(v))}
          debounce={300}
        />
      </div>
      <BuildsStatusFilter statuses={statuses} onStatusesChange={setStatuses} />
    </div>
  )
}
