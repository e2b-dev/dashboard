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

export type TemplatesSort =
  | 'name_asc'
  | 'name_desc'
  | 'cpu_count_asc'
  | 'cpu_count_desc'
  | 'memory_mb_asc'
  | 'memory_mb_desc'
  | 'created_at_asc'
  | 'created_at_desc'
  | 'updated_at_asc'
  | 'updated_at_desc'

export interface ListTeamTemplatesOptions {
  cursor?: string
  limit?: number
  cpuCount?: number
  memoryMB?: number
  public?: boolean
  search?: string
  sort?: TemplatesSort
}

export interface ListTeamTemplatesResult {
  data: Array<Template | DefaultTemplate>
  nextCursor: string | null
}
