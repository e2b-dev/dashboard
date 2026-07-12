// Used when sign-in bootstrap fails before Auth.js finalizes a session. The
// callback stores the id_token in this short-lived httpOnly cookie, then
// redirects through this route so the browser can clear the Ory session.
export const ORY_BOOTSTRAP_FAILURE_FLOW_PATH =
  '/api/auth/oauth/bootstrap-failed'
export const ORY_BOOTSTRAP_FAILURE_ID_TOKEN_COOKIE =
  'e2b-ory-bootstrap-failed-id-token'

export const ORY_POST_LOGOUT_PATH = '/'

export function buildOryLogoutUrl({
  idToken,
  origin,
}: {
  idToken: string
  origin: string
}): URL | null {
  const hydraPublicUrl =
    process.env.ORY_HYDRA_PUBLIC_URL ?? process.env.ORY_SDK_URL
  if (!hydraPublicUrl) return null

  const postLogoutUrl = new URL(ORY_POST_LOGOUT_PATH, origin)
  const logoutUrl = new URL(
    `${hydraPublicUrl.replace(/\/$/, '')}/oauth2/sessions/logout`
  )
  logoutUrl.searchParams.set('id_token_hint', idToken)
  logoutUrl.searchParams.set(
    'post_logout_redirect_uri',
    postLogoutUrl.toString()
  )

  return logoutUrl
}
