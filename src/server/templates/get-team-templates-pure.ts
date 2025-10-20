import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/lib/clients/api'

export const getTeamTemplatesPure = async (
  teamId: string,
  access_token: string
) => {
  const res = await infra.GET('/templates', {
    params: {
      query: {
        teamID: teamId,
      },
    },
    headers: {
      ...SUPABASE_AUTH_HEADERS(access_token),
    },
  })

  return res
}
