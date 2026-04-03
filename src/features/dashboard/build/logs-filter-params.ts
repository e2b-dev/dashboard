import { createLoader, parseAsStringEnum } from 'nuqs/server'
import type { BuildLogModel } from '@/core/modules/builds/models'

export type LogLevelFilter = BuildLogModel['level']

export const LOG_LEVELS: LogLevelFilter[] = ['debug', 'info', 'warn', 'error']

export const buildLogsFilterParams = {
  level: parseAsStringEnum(['debug', 'info', 'warn', 'error'] as const),
}

export const loadBuildLogsFilters = createLoader(buildLogsFilterParams)
