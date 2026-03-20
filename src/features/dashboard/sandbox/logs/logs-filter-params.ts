import { createLoader, parseAsString, parseAsStringEnum } from 'nuqs/server'
import type { SandboxLogModel } from '@/core/modules/sandboxes/models'

export type LogLevelFilter = SandboxLogModel['level']

export const LOG_LEVELS: LogLevelFilter[] = ['debug', 'info', 'warn', 'error']

export const sandboxLogsFilterParams = {
  level: parseAsStringEnum(['debug', 'info', 'warn', 'error'] as const),
  search: parseAsString,
}

export const loadSandboxLogsFilters = createLoader(sandboxLogsFilterParams)
