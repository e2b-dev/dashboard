import { BuildLogDTO } from '@/server/api/models/builds.models'
import { createLoader, parseAsArrayOf, parseAsStringEnum } from 'nuqs/server'

export type LogLevelFilter = BuildLogDTO['level']

export const ALL_LOG_LEVELS: LogLevelFilter[] = [
  'debug',
  'info',
  'warn',
  'error',
]

export const buildLogsFilterParams = {
  levels: parseAsArrayOf(
    parseAsStringEnum(['debug', 'info', 'warn', 'error'] as const)
  ),
}

export const loadBuildLogsFilters = createLoader(buildLogsFilterParams)
