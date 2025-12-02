import type { components } from '@/types/infra-api.types'
import z from 'zod'

export const BuildStatusDTOSchema = z.enum(['building', 'failed', 'success'])

export type BuildStatusDTO = z.infer<typeof BuildStatusDTOSchema>
export type BuildStatusDB = 'waiting' | 'building' | 'uploaded' | 'failed'

export interface ListedBuildDTO {
  id: string
  // id or alias
  template: string
  templateId: string
  status: BuildStatusDTO
  statusMessage: string | null
  createdAt: number
  finishedAt: number | null
}

export interface RunningBuildStatusDTO {
  id: string
  status: BuildStatusDTO
  finishedAt: number | null
  statusMessage: string | null
}

export interface BuildLogDTO {
  timestampUnix: number
  millisAfterCreatedAt: number
  level: components['schemas']['LogLevel']
  message: string
}

export interface BuildDetailsDTO {
  // id or alias
  template: string
  createdAt: number
  finishedAt: number | null
  status: BuildStatusDTO
  statusMessage: string | null
  logs: BuildLogDTO[]
}

// database queries

type RawListedBuildWithEnvAndAliasesDB = {
  id: string
  env_id: string
  status: string
  reason: unknown
  created_at: string
  finished_at: string | null
  envs: {
    id: string
    team_id: string
    env_aliases: Array<{ alias: string }> | null
  }
}

// mappings

export function mapDatabaseBuildReasonToListedBuildDTOStatusMessage(
  status: string,
  reason: unknown
): string | null {
  if (status !== 'failed') return null
  if (!reason || typeof reason !== 'object') return null
  if (!('message' in reason)) return null
  if (typeof reason.message !== 'string') return null
  return reason.message
}

export function mapDatabaseBuildToListedBuildDTO(
  build: RawListedBuildWithEnvAndAliasesDB
): ListedBuildDTO {
  const alias = build.envs.env_aliases?.[0]?.alias

  return {
    id: build.id,
    template: alias ?? build.env_id,
    templateId: build.env_id,
    status: mapDatabaseBuildStatusToBuildStatusDTO(
      build.status as BuildStatusDB
    ),
    statusMessage: mapDatabaseBuildReasonToListedBuildDTOStatusMessage(
      build.status,
      build.reason
    ),
    createdAt: new Date(build.created_at).getTime(),
    finishedAt: build.finished_at
      ? new Date(build.finished_at).getTime()
      : null,
  }
}

export function mapBuildStatusDTOToDatabaseBuildStatus(
  buildStatusDTO: BuildStatusDTO
): BuildStatusDB[] {
  switch (buildStatusDTO) {
    case 'building':
      return ['building', 'waiting']
    case 'failed':
      return ['failed']
    case 'success':
      return ['uploaded']
  }
}

export function mapDatabaseBuildStatusToBuildStatusDTO(
  dbStatus: BuildStatusDB
): BuildStatusDTO {
  switch (dbStatus) {
    case 'waiting':
    case 'building':
      return 'building'
    case 'uploaded':
      return 'success'
    case 'failed':
      return 'failed'
  }
}

export function mapInfraBuildStatusToBuildStatusDTO(
  status: components['schemas']['TemplateBuild']['status']
): BuildStatusDTO {
  switch (status) {
    case 'building':
      return 'building'
    case 'waiting':
      return 'building'
    case 'ready':
      return 'success'
    case 'error':
      return 'failed'
  }
}
