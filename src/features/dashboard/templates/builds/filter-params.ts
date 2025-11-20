import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
} from 'nuqs/server'

export const templateBuildsFilterParams = {
  statuses: parseAsArrayOf(
    parseAsStringEnum(['building', 'failed', 'success'])
  ),
  buildIdOrTemplate: parseAsString,
}

export const loadTemplateBuildsFilters = createLoader(
  templateBuildsFilterParams
)
