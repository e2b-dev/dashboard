import { BuildStatusDTO } from '@/server/api/models/builds.models'

export const INITIAL_BUILD_STATUSES: BuildStatusDTO[] = [
  'building',
  'failed',
  'success',
]
