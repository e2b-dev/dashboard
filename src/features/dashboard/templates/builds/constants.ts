import { BuildStatus } from '@/server/api/models/builds.models'
import { millisecondsInDay } from 'date-fns/constants'

export const LOG_RETENTION_MS = 7 * millisecondsInDay // 7 days

export const INITIAL_BUILD_STATUSES: BuildStatus[] = [
  'building',
  'failed',
  'success',
]
