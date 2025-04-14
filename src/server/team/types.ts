import { Database } from '@/types/database.types'

export type TeamMemberInfo = {
  id: string
  email: string
  name: string
  avatar_url: string
}

export type TeamMember = {
  info: TeamMemberInfo
  relation: Database['public']['Tables']['users_teams']['Row']
}
