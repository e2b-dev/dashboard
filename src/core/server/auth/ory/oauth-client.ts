import * as oauth from 'oauth4webapi'
import { isLoopbackUrl } from '@/core/shared/schemas/url'
import {
  authorizationParamsForOryIntent,
  type OryAuthIntent,
} from './build-start-url'

// Hand-owned Hydra OIDC client (confidential, client_secret_basic) built on
// oauth4webapi. PKCE (S256) is always used even though the client is
// confidential — it protects against authorization-code injection regardless of
// client type. No next/headers import so this stays importable from the edge
// middleware (refresh path reuses the issuer/client config).

const OAUTH_SCOPE = 'openid offline_access email profile'

export type OryAuthorizationRequest = {
  url: string
  state: string
  nonce: string
  codeVerifier: string
}

export type OryTokenExchange = {
  accessToken: string
  refreshToken?: string
  idToken?: string
  // Absolute access-token expiry, epoch seconds.
  expiresAt: number
}

type OryOAuthEnv = {
  issuer: URL
  clientId: string
  clientSecret: string
  audience?: string
  // Hydra runs on plain HTTP loopback in local dev; oauth4webapi rejects
  // non-HTTPS endpoints unless explicitly allowed. Restricted to loopback so a
  // non-local HTTP issuer can never silently disable TLS — it fails closed.
  insecure: boolean
}

export function readOryOAuthEnv(): OryOAuthEnv {
  const issuerValue =
    process.env.ORY_HYDRA_PUBLIC_URL ?? process.env.ORY_SDK_URL
  const clientId = process.env.ORY_OAUTH2_CLIENT_ID
  const clientSecret = process.env.ORY_OAUTH2_CLIENT_SECRET

  if (!issuerValue || !clientId || !clientSecret) {
    throw new Error(
      'Ory OAuth client is misconfigured (need ORY_HYDRA_PUBLIC_URL or ORY_SDK_URL, ORY_OAUTH2_CLIENT_ID, ORY_OAUTH2_CLIENT_SECRET)'
    )
  }

  const issuer = new URL(issuerValue)
  return {
    issuer,
    clientId,
    clientSecret,
    audience: process.env.ORY_OAUTH2_AUDIENCE,
    insecure: issuer.protocol === 'http:' && isLoopbackUrl(issuer.href),
  }
}

let cachedAs: {
  issuer: string
  as: Promise<oauth.AuthorizationServer>
} | null = null

function discoverAuthorizationServer(
  env: OryOAuthEnv
): Promise<oauth.AuthorizationServer> {
  if (cachedAs?.issuer === env.issuer.href) return cachedAs.as

  const discovery = oauth
    .discoveryRequest(env.issuer, {
      algorithm: 'oidc',
      ...(env.insecure ? { [oauth.allowInsecureRequests]: true } : {}),
    })
    .then((response) => oauth.processDiscoveryResponse(env.issuer, response))

  // A rejected discovery must not poison the cache — let the next call retry.
  discovery.catch(() => {
    if (cachedAs?.as === discovery) cachedAs = null
  })

  cachedAs = { issuer: env.issuer.href, as: discovery }
  return discovery
}

function oryClient(env: OryOAuthEnv): oauth.Client {
  return { client_id: env.clientId }
}

export async function buildOryAuthorizationRequest(
  intent: OryAuthIntent,
  redirectUri: string,
  options?: { state?: string }
): Promise<OryAuthorizationRequest> {
  const env = readOryOAuthEnv()
  const as = await discoverAuthorizationServer(env)

  if (!as.authorization_endpoint) {
    throw new Error('Ory discovery metadata is missing authorization_endpoint')
  }

  const codeVerifier = oauth.generateRandomCodeVerifier()
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier)
  // In relay mode the caller supplies a sealed state carrying the preview
  // origin; it doubles as the CSRF state validated at the callback.
  const state = options?.state ?? oauth.generateRandomState()
  const nonce = oauth.generateRandomNonce()

  const url = new URL(as.authorization_endpoint)
  url.searchParams.set('client_id', env.clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', OAUTH_SCOPE)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', state)
  url.searchParams.set('nonce', nonce)
  if (env.audience) url.searchParams.set('audience', env.audience)

  const prompt = authorizationParamsForOryIntent(intent)?.prompt
  if (prompt) url.searchParams.set('prompt', prompt)

  return { url: url.toString(), state, nonce, codeVerifier }
}

export async function exchangeOryCallback(params: {
  currentUrl: URL
  expectedState: string
  expectedNonce: string
  codeVerifier: string
  redirectUri: string
}): Promise<OryTokenExchange> {
  const env = readOryOAuthEnv()
  const as = await discoverAuthorizationServer(env)
  const client = oryClient(env)
  const clientAuth = oauth.ClientSecretBasic(env.clientSecret)

  const callbackParams = oauth.validateAuthResponse(
    as,
    client,
    params.currentUrl,
    params.expectedState
  )

  const response = await oauth.authorizationCodeGrantRequest(
    as,
    client,
    clientAuth,
    callbackParams,
    params.redirectUri,
    params.codeVerifier,
    env.insecure ? { [oauth.allowInsecureRequests]: true } : undefined
  )

  const processOptions: oauth.ProcessAuthorizationCodeResponseOptions = {
    expectedNonce: params.expectedNonce,
    requireIdToken: true,
  }
  // allowInsecureRequests is read off the same options object for the implicit
  // JWKS fetch that verifies the id_token; it is not in the public option type.
  if (env.insecure) {
    ;(processOptions as Record<symbol, unknown>)[oauth.allowInsecureRequests] =
      true
  }

  const result = await oauth.processAuthorizationCodeResponse(
    as,
    client,
    response,
    processOptions
  )

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    idToken: result.id_token,
    expiresAt: absoluteExpiry(result.expires_in),
  }
}

export function absoluteExpiry(
  expiresIn: number | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): number {
  // Hydra always returns expires_in; the fallback only guards a missing value.
  return nowSeconds + (expiresIn ?? 300)
}
