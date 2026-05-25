import { isOryAuthEnabled } from './flags'

export const API_KEY_PREFIX = 'e2b_'
export const ACCESS_TOKEN_PREFIX = 'sk_e2b_'
export const SUPABASE_TOKEN_HEADER = 'X-Supabase-Token'
export const SUPABASE_TEAM_HEADER = 'X-Supabase-Team'
export const AUTH_PROVIDER_TEAM_HEADER = 'X-Team-ID'
export const ENVD_ACCESS_TOKEN_HEADER = 'X-Access-Token'
export const ADMIN_TOKEN_HEADER = 'X-Admin-Token'

export const authHeaders = (
  token: string,
  teamId?: string
): Record<string, string> => {
  const isOry = isOryAuthEnabled()
  const headers: Record<string, string> = isOry
    ? { Authorization: `Bearer ${token}` }
    : { [SUPABASE_TOKEN_HEADER]: token }
  if (teamId) {
    headers[isOry ? AUTH_PROVIDER_TEAM_HEADER : SUPABASE_TEAM_HEADER] = teamId
  }
  return headers
}

export const ADMIN_AUTH_HEADERS = (token: string) => ({
  [ADMIN_TOKEN_HEADER]: token,
})
export const CLI_GENERATED_KEY_NAME = 'CLI login/configure'
