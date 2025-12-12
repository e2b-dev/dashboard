import { BuildLogDTO } from '@/server/api/models/builds.models'
import { createLoader, parseAsStringEnum } from 'nuqs/server'

export type LogLevelFilter = BuildLogDTO['level']

export const LOG_LEVELS: LogLevelFilter[] = ['debug', 'info', 'warn', 'error']

export const buildLogsFilterParams = {
  level: parseAsStringEnum(['debug', 'info', 'warn', 'error'] as const),
}

export const loadBuildLogsFilters = createLoader(buildLogsFilterParams)
