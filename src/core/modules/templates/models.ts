import type {
  components as InfraComponents,
  paths as InfraPaths,
} from '@/contracts/infra-api'

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

export type TemplateDetail = Pick<
  InfraComponents['schemas']['TemplateWithBuilds'],
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

export type TemplatesSort = InfraComponents['parameters']['templatesSort']

// Mirrors `templatesSearch.maxLength` in spec/openapi.infra.yaml
export const TEMPLATES_SEARCH_MAX_LENGTH = 256

export type ListTeamTemplatesOptions = NonNullable<
  InfraPaths['/unstable/templates/search']['get']['parameters']['query']
>

export interface ListTeamTemplatesResult {
  data: Array<Template | DefaultTemplate>
  nextCursor: string | null
}

export type TemplateTag = InfraComponents['schemas']['TemplateTag']

export type TemplateTagAssignment =
  InfraComponents['schemas']['TemplateTagAssignment']
export type TemplateTagGroup = InfraComponents['schemas']['TemplateTagGroup']
export type TemplateTagExistsResult =
  InfraComponents['schemas']['TemplateTagExistsResponse']
