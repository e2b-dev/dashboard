import { LOG_RETENTION_MS } from '@/configs/logs'
import type { BuildStatusDTO } from '@/server/api/models/builds.models'

export { LOG_RETENTION_MS }

export const INITIAL_BUILD_STATUSES: BuildStatusDTO[] = [
  'building',
  'failed',
  'success',
]
