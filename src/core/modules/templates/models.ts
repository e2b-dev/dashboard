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
