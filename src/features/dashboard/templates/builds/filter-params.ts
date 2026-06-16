import {
  createLoader,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from 'nuqs/server'

export const templateBuildsFilterParams = {
  statuses: parseAsArrayOf(
    parseAsStringEnum(['building', 'failed', 'success'])
  ),
  buildIdOrTemplate: parseAsString,
  cpuCount: parseAsInteger,
  memoryMB: parseAsInteger,
}

export const loadTemplateBuildsFilters = createLoader(
  templateBuildsFilterParams
)
