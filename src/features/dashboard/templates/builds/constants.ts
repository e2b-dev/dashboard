import { BuildStatusDTO } from '@/server/api/models/builds.models'

export const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export const INITIAL_BUILD_STATUSES: BuildStatusDTO[] = [
  'building',
  'failed',
  'success',
]
