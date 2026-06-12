import type { SortingState } from '@tanstack/react-table'
import type { TemplatesSort } from '@/core/modules/templates/models'

export const TEMPLATES_PAGE_SIZE = 50

export const TEMPLATES_DEFAULT_SORT_COLUMN_ID = 'updatedAt'
export const TEMPLATES_DEFAULT_SORT_BASE = 'updated_at'
export const TEMPLATES_DEFAULT_SORT_DESC = true

export const TEMPLATES_DEFAULT_SORT: TemplatesSort = `${TEMPLATES_DEFAULT_SORT_BASE}_${
  TEMPLATES_DEFAULT_SORT_DESC ? 'desc' : 'asc'
}`

export const TEMPLATES_DEFAULT_SORTING: SortingState = [
  { id: TEMPLATES_DEFAULT_SORT_COLUMN_ID, desc: TEMPLATES_DEFAULT_SORT_DESC },
]
