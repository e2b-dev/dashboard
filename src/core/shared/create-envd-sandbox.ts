import Sandbox, { type SandboxConnectOpts } from 'e2b'

const SDK_ENVD_PORT = 49983

/**
 * Sandbox-scoped credentials needed to talk to a sandbox's envd daemon
 * (filesystem + PTY). These are safe to expose to the browser: they grant
 * access to a single sandbox only, unlike the account-level access token.
 */
export interface EnvdSandboxParams {
  sandboxId: string
  sandboxDomain?: string | null
  envdVersion: string
  // Optional: `secure: false` sandboxes expose envd without an access token.
  envdAccessToken?: string
  domain?: string
  sandboxUrl?: string
  trafficAccessToken?: string
}

/**
 * The {@link Sandbox} constructor is marked `@internal` in the SDK type defs
 * (the public entry points are `Sandbox.create`/`Sandbox.connect`, both of
 * which make a control-plane call that requires the account-level access
 * token). We deliberately bypass those and build an envd-only instance
 * directly from sandbox-scoped credentials: the constructor performs NO
 * network call and authenticates every `files.*`/`pty.*` request with the
 * `envdAccessToken` alone.
 *
 * The cast is isolated here so the rest of the codebase never touches the
 * internal API. The option object is typed against the exported
 * `SandboxConnectOpts`, so an SDK field rename surfaces as a compile error.
 */
type EnvdSandboxConstructor = new (
  opts: SandboxConnectOpts & {
    sandboxId: string
    sandboxDomain?: string
    envdVersion: string
    envdAccessToken?: string
    trafficAccessToken?: string
  }
) => Sandbox

export function createEnvdSandbox(params: EnvdSandboxParams): Sandbox {
  const SandboxCtor = Sandbox as unknown as EnvdSandboxConstructor

  const sandboxUrl =
    params.sandboxUrl ??
    (params.domain ? `https://${params.domain}` : params.sandboxUrl)

  return new SandboxCtor({
    sandboxId: params.sandboxId,
    sandboxDomain: params.sandboxDomain ?? undefined,
    envdVersion: params.envdVersion,
    envdAccessToken: params.envdAccessToken,
    trafficAccessToken: params.trafficAccessToken,
    domain: params.domain,
    sandboxUrl: resolveBrowserSandboxUrl(sandboxUrl, params.sandboxId),
  })
}

export function resolveBrowserSandboxUrl(
  sandboxUrl: string | undefined,
  sandboxId: string
) {
  if (!sandboxUrl || typeof window === 'undefined') return sandboxUrl

  try {
    const url = new URL(sandboxUrl)
    const sandboxHostPrefix = `${SDK_ENVD_PORT}-${sandboxId}.`

    if (!url.hostname.startsWith(sandboxHostPrefix)) {
      url.hostname = `${sandboxHostPrefix}${url.hostname}`
    }

    return url.toString()
  } catch {
    return sandboxUrl
  }
}
