import type {
  components as DashboardComponents,
  paths as DashboardPaths,
} from '@/contracts/dashboard-api'
import type { components as InfraComponents } from '@/contracts/infra-api'

export type Template = Pick<
  InfraComponents['schemas']['Template'],
  | 'templateID'
  | 'buildID'
  | 'cpuCount'
  | 'memoryMB'
  | 'diskSizeMB'
  | 'public'
  | 'aliases'
  | 'names'
  | 'createdAt'
  | 'updatedAt'
  | 'createdBy'
  | 'lastSpawnedAt'
  | 'spawnCount'
  | 'buildCount'
  | 'envdVersion'
>

export type DefaultTemplate = Template & {
  isDefault: true
  defaultDescription?: string
}

export type TemplatesSort = DashboardComponents['parameters']['templates_sort']

export type ListTeamTemplatesOptions = NonNullable<
  DashboardPaths['/templates']['get']['parameters']['query']
>

export interface ListTeamTemplatesResult {
  data: Array<Template | DefaultTemplate>
  nextCursor: string | null
}
