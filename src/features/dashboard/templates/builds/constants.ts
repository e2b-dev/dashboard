import { BuildStatus } from '@/server/api/models/builds.models'

export const INITIAL_BUILD_STATUSES: BuildStatus[] = [
  'building',
  'failed',
  'success',
]
