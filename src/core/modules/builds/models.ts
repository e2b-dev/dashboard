import { z } from 'zod'
import type { components as dashboardComponents } from '@/contracts/dashboard-api'
import type { components as infraComponents } from '@/contracts/infra-api'

export type BuildStatus = dashboardComponents['schemas']['BuildStatus']

// TypeCheck: BuildStatus enum is exhaustive

const BUILD_STATUS_VALUES = [
  'building',
  'failed',
  'success',
] as const satisfies readonly BuildStatus[]

type AssertTrue<T extends true> = T
type _BuildStatusExhaustiveCheck = AssertTrue<
  Exclude<BuildStatus, (typeof BUILD_STATUS_VALUES)[number]> extends never
    ? true
    : false
>

// TypeCheck: End

export const BuildStatusSchema = z.enum(BUILD_STATUS_VALUES)
export interface ListedBuildModel {
  id: string
  // id or alias
  template: string
  templateId: string
  status: BuildStatus
  statusMessage: string | null
  createdAt: number
  finishedAt: number | null
}

export interface RunningBuildStatusModel {
  id: string
  status: BuildStatus
  finishedAt: number | null
  statusMessage: string | null
}

export interface BuildLogModel {
  timestampUnix: number
  level: infraComponents['schemas']['LogLevel']
  message: string
}

export interface BuildLogsModel {
  logs: BuildLogModel[]
  nextCursor: number | null
}

export interface BuildDetailsModel {
  templateNames: string[] | null
  // id or alias
  template: string
  startedAt: number
  finishedAt: number | null
  status: BuildStatus
  statusMessage: string | null
  hasRetainedLogs: boolean
}
