import Sandbox, { type SandboxConnectOpts } from 'e2b'

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

  return new SandboxCtor({
    sandboxId: params.sandboxId,
    sandboxDomain: params.sandboxDomain ?? undefined,
    envdVersion: params.envdVersion,
    envdAccessToken: params.envdAccessToken,
    trafficAccessToken: params.trafficAccessToken,
    domain: params.domain,
    sandboxUrl: params.sandboxUrl,
  })
}
