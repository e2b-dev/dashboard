export type { ClientTeam } from '@/types/dashboard.types'

export type TeamLimits = {
  concurrentInstances: number
  diskMb: number
  maxLengthHours: number
  maxRamMb: number
  maxVcpu: number
}

export type TeamMemberInfo = {
  id: string
  email: string
  name?: string
  avatar_url?: string
}

export type TeamMemberRelation = {
  added_by: string | null
  is_default: boolean
}

export type TeamMember = {
  info: TeamMemberInfo
  relation: TeamMemberRelation
}

export type ResolvedTeam = {
  id: string
  slug: string
}
