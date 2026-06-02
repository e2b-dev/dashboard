import type {
  components as DashboardComponents,
  paths as DashboardPaths,
} from '@/contracts/dashboard-api'
import type { components as InfraComponents } from '@/contracts/infra-api'
import type { BuildStatus } from '@/core/modules/builds/models'

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

export type TemplateTag = InfraComponents['schemas']['TemplateTag']

export interface TemplateDefaultBuildModel {
  buildID: string
  status: BuildStatus
  createdAt: number
  finishedAt: number | null
  cpuCount: number
  memoryMB: number
  diskSizeMB: number | null
  envdVersion: string | null
}

export type TemplateTagAssignment =
  DashboardComponents['schemas']['TemplateTagAssignment']
export type TemplateTagGroup =
  DashboardComponents['schemas']['TemplateTagGroup']
export type TemplateTagExistsResult =
  DashboardComponents['schemas']['TemplateTagExistsResponse']
