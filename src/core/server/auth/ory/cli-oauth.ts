import 'server-only'

import { EncryptJWT, jwtDecrypt } from 'jose'
import * as oauth from 'oauth4webapi'
import { isLoopbackUrl } from '@/core/shared/schemas/url'
import { CONTENT_ENCRYPTION, deriveKey, KEY_ALGORITHM } from './cookie-crypto'

// Public OAuth2 client for CLI token issuance. Mirrors oauth-client.ts but
// uses oauth.None() (no client secret) instead of ClientSecretBasic. The CLI
// receives Hydra JWTs via this flow and refreshes them directly with Ory.

const OAUTH_SCOPE = 'openid offline_access email profile'

export const CLI_OAUTH_FLOW_COOKIE = 'e2b_cli_oauth_flow'
export const CLI_OAUTH_CALLBACK_PATH = '/api/auth/oauth/cli-callback'

const FLOW_COOKIE_MAX_AGE_SECONDS = 60 * 5

type CliOAuthEnv = {
  issuer: URL
  clientId: string
  audience?: string
  insecure: boolean
}

export type CliAuthorizationRequest = {
  url: string
  state: string
  codeVerifier: string
}

export type CliTokenExchange = {
  accessToken: string
  refreshToken?: string
}

export type CliFlowState = {
  state: string
  codeVerifier: string
  next: string
}

export function readCliOAuthEnv(): CliOAuthEnv {
  const issuerValue =
    process.env.ORY_HYDRA_PUBLIC_URL ?? process.env.ORY_SDK_URL
  const clientId = process.env.ORY_OAUTH2_CLI_CLIENT_ID

  if (!issuerValue || !clientId) {
    throw new Error(
      'CLI OAuth client is misconfigured (need ORY_HYDRA_PUBLIC_URL or ORY_SDK_URL, ORY_OAUTH2_CLI_CLIENT_ID)'
    )
  }

  const issuer = new URL(issuerValue)
  return {
    issuer,
    clientId,
    audience: process.env.ORY_OAUTH2_AUDIENCE,
    insecure: issuer.protocol === 'http:' && isLoopbackUrl(issuer.href),
  }
}

let cachedAs: {
  issuer: string
  as: Promise<oauth.AuthorizationServer>
} | null = null

function discoverAuthorizationServer(
  env: CliOAuthEnv
): Promise<oauth.AuthorizationServer> {
  if (cachedAs?.issuer === env.issuer.href) return cachedAs.as

  const discovery = oauth
    .discoveryRequest(env.issuer, {
      algorithm: 'oidc',
      ...(env.insecure ? { [oauth.allowInsecureRequests]: true } : {}),
    })
    .then((response) => oauth.processDiscoveryResponse(env.issuer, response))

  discovery.catch(() => {
    if (cachedAs?.as === discovery) cachedAs = null
  })

  cachedAs = { issuer: env.issuer.href, as: discovery }
  return discovery
}

function cliClient(env: CliOAuthEnv): oauth.Client {
  return { client_id: env.clientId }
}

export async function buildCliAuthorizationRequest(
  redirectUri: string
): Promise<CliAuthorizationRequest> {
  const env = readCliOAuthEnv()
  const as = await discoverAuthorizationServer(env)

  if (!as.authorization_endpoint) {
    throw new Error('Ory discovery metadata is missing authorization_endpoint')
  }

  const codeVerifier = oauth.generateRandomCodeVerifier()
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier)
  const state = oauth.generateRandomState()

  const url = new URL(as.authorization_endpoint)
  url.searchParams.set('client_id', env.clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', OAUTH_SCOPE)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', state)
  if (env.audience) url.searchParams.set('audience', env.audience)

  return { url: url.toString(), state, codeVerifier }
}

export async function exchangeCliCallback(params: {
  currentUrl: URL
  expectedState: string
  codeVerifier: string
  redirectUri: string
}): Promise<CliTokenExchange> {
  const env = readCliOAuthEnv()
  const as = await discoverAuthorizationServer(env)
  const client = cliClient(env)
  // Public client: no client secret.
  const clientAuth = oauth.None()

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

  const result = await oauth.processAuthorizationCodeResponse(
    as,
    client,
    response,
    // CLI flow does not use nonce (no id_token verification needed).
    { expectedNonce: undefined, requireIdToken: false }
  )

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
  }
}

export async function sealCliFlowState(flow: CliFlowState): Promise<string> {
  return new EncryptJWT({
    state: flow.state,
    codeVerifier: flow.codeVerifier,
    next: flow.next,
  })
    .setProtectedHeader({ alg: KEY_ALGORITHM, enc: CONTENT_ENCRYPTION })
    .setIssuedAt()
    .encrypt(await deriveKey())
}

export async function openCliFlowState(
  value: string | undefined | null
): Promise<CliFlowState | null> {
  if (!value) return null

  try {
    const { payload } = await jwtDecrypt(value, await deriveKey())
    const { state, codeVerifier, next } = payload
    if (
      typeof state !== 'string' ||
      typeof codeVerifier !== 'string' ||
      typeof next !== 'string'
    ) {
      return null
    }

    return { state, codeVerifier, next }
  } catch {
    return null
  }
}

export function cliFlowCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    path: '/' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: FLOW_COOKIE_MAX_AGE_SECONDS,
  }
}

export function buildTokenEndpoint(issuer: string): string {
  const base = issuer.replace(/\/$/, '')
  return `${base}/oauth2/token`
}

export function buildRevokeEndpoint(issuer: string): string {
  const base = issuer.replace(/\/$/, '')
  return `${base}/oauth2/revoke`
}
