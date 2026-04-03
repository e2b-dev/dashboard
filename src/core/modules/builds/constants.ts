import type { BuildStatus } from './models'

export const INITIAL_BUILD_STATUSES: BuildStatus[] = [
  'building',
  'failed',
  'success',
]
