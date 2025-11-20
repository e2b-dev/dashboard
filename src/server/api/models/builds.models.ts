export type BuildStatus = 'building' | 'failed' | 'success'

export interface BuildDTO {
  id: string
  shortId: string
  template: string
  status: BuildStatus
  createdAt: number
  finishedAt: number | null
}

export function mapBuildStatus(
  dbStatus: 'waiting' | 'building' | 'uploaded' | 'failed'
): BuildStatus {
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
