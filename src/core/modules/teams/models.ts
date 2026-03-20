import type { components as DashboardComponents } from '@/contracts/dashboard-api'

export type TeamModel = DashboardComponents['schemas']['UserTeam']
export type TeamLimits = DashboardComponents['schemas']['UserTeamLimits']

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
