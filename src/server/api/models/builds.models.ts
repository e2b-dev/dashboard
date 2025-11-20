import z from 'zod'

export const BuildStatusSchema = z.enum(['building', 'failed', 'success'])

export type BuildStatus = z.infer<typeof BuildStatusSchema>
export type BuildStatusDB = 'waiting' | 'building' | 'uploaded' | 'failed'

export interface BuildDTO {
  id: string
  shortId: string
  template: string
  status: BuildStatus
  statusMessage: string | null
  createdAt: number
  finishedAt: number | null
}

export function mapBuildStatusDTO(dbStatus: BuildStatus) {
  switch (dbStatus) {
    case 'building':
      return ['building', 'waiting']
    case 'failed':
      return ['failed']
    case 'success':
      return ['uploaded']
  }
}

export function mapBuildStatusDB(dbStatus: BuildStatusDB): BuildStatus {
  switch (dbStatus) {
    case 'waiting':
    case 'building':
      return 'building'
    case 'uploaded':
      return 'success'
    case 'failed':
      return 'failed'
  }
}
