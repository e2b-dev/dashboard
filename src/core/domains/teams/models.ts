import type { Database } from '@/core/shared/contracts/database.types'

export type ClientTeam = Database['public']['Tables']['teams']['Row'] & {
  is_default?: boolean
  transformed_default_name?: string
}

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
  providers?: string[]
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
