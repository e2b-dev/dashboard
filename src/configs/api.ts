export const API_KEY_PREFIX = 'e2b_'
export const ACCESS_TOKEN_PREFIX = 'sk_e2b_'
export const AUTHORIZATION_HEADER = 'Authorization'
export const BEARER_TOKEN_PREFIX = 'Bearer '
export const TEAM_ID_HEADER = 'X-Team-ID'
export const ENVD_ACCESS_TOKEN_HEADER = 'X-Access-Token'
export const ADMIN_TOKEN_HEADER = 'X-Admin-Token'

type AuthHeaderStrategy = {
  tokenHeader: string
  tokenPrefix: string
  teamHeader: string
}

const oryHeaderStrategy: AuthHeaderStrategy = {
  tokenHeader: AUTHORIZATION_HEADER,
  tokenPrefix: BEARER_TOKEN_PREFIX,
  teamHeader: TEAM_ID_HEADER,
}

export function authHeaders(
  token: string,
  teamId?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    [oryHeaderStrategy.tokenHeader]: `${oryHeaderStrategy.tokenPrefix}${token}`,
  }
  if (teamId) headers[oryHeaderStrategy.teamHeader] = teamId
  return headers
}

export const ADMIN_AUTH_HEADERS = (token: string) => ({
  [ADMIN_TOKEN_HEADER]: token,
})
export const CLI_GENERATED_KEY_NAME = 'CLI login/configure'
