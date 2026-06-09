import { decodeJwtClaims } from './jwt-claims'

// How recently the user must have authenticated (via the OAuth2 login flow)
// for a sensitive operation like a password change to be allowed without a
// forced re-auth round-trip.
export const REAUTH_FRESHNESS_WINDOW_SECONDS = 300

type AuthTimeClaims = {
  auth_time?: unknown
}

// Reads the OIDC `auth_time` claim (epoch seconds) from the id_token. Hydra
// stamps this with the moment the user last actively authenticated, which is
// what `prompt=login` refreshes.
export function readAuthTime(idToken: string | undefined): number | null {
  if (!idToken) return null

  const claims = decodeJwtClaims<AuthTimeClaims>(idToken)
  const authTime = claims?.auth_time
  return typeof authTime === 'number' && Number.isFinite(authTime)
    ? authTime
    : null
}

export function isReauthFresh(
  idToken: string | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  const authTime = readAuthTime(idToken)
  if (authTime === null) return false

  return nowSeconds - authTime <= REAUTH_FRESHNESS_WINDOW_SECONDS
}
