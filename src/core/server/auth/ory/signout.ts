export const ORY_POST_LOGOUT_PATH = '/'

// Builds Hydra's RP-initiated logout URL. With the id_token as the hint Hydra
// ends both its own OAuth2 session and (since it delegates login to Kratos) the
// Kratos session, then returns the browser to post_logout_redirect_uri.
export function buildOryLogoutUrl({
  idToken,
  origin,
}: {
  idToken: string
  origin: string
}): URL | null {
  const issuer = process.env.ORY_HYDRA_PUBLIC_URL ?? process.env.ORY_SDK_URL
  if (!issuer) return null

  const postLogoutUrl = new URL(ORY_POST_LOGOUT_PATH, origin)
  const logoutUrl = new URL(
    `${issuer.replace(/\/$/, '')}/oauth2/sessions/logout`
  )
  logoutUrl.searchParams.set('id_token_hint', idToken)
  logoutUrl.searchParams.set(
    'post_logout_redirect_uri',
    postLogoutUrl.toString()
  )

  return logoutUrl
}
