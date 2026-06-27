import 'server-only'

import {
  Configuration,
  FlowType,
  FrontendApi,
  handleFlowError,
  type LoginFlow,
  type RecoveryFlow,
  type RegistrationFlow,
  type Session,
  type SettingsFlow,
  type VerificationFlow,
} from '@ory/client-fetch'
import { headers } from 'next/headers'
import { redirect, RedirectType } from 'next/navigation'
import oryConfig from '@/configs/ory'

// Flow types come from the top-level @ory/client-fetch (same copy the
// FrontendApi calls below use), so this module is self-consistent. The Elements
// card components bundle a different @ory/client-fetch copy whose flow enums
// differ; the *-card.tsx wrappers bridge that seam (they forward the flow
// straight into the real <Login>/<Settings>/... which re-narrows it).

// Server-side counterpart to @ory/nextjs's getLoginFlow/getRegistrationFlow/etc.
//
// Those getters fetch the flow with basePath = NEXT_PUBLIC_ORY_SDK_URL (the
// PUBLIC Kratos ingress). Inside an E2B sandbox that absolute public URL loops
// back out through the ingress into the dashboard and 429s, 500ing the flow
// page. We fetch Kratos over the INTERNAL loopback URL instead, then rewrite the
// public Kratos URL in the returned flow to the dashboard's own origin so the
// Elements form still submits same-origin through the @ory/nextjs proxy.

function internalKratosUrl(): string {
  return (
    process.env.ORY_KRATOS_PUBLIC_URL_INTERNAL ?? 'http://localhost:4433'
  ).replace(/\/$/, '')
}

function publicKratosUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_ORY_SDK_URL ?? process.env.ORY_SDK_URL
  return url ? url.replace(/\/$/, '') : null
}

function serverFrontendClient(): FrontendApi {
  return new FrontendApi(
    new Configuration({
      basePath: internalKratosUrl(),
      headers: { Accept: 'application/json' },
    })
  )
}

// The dashboard origin the browser reached. The proxy stamps x-forwarded-* with
// https + the public host (see proxy/runtime.ts forceHttpsForSandbox).
async function dashboardOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

type FlowParams = Record<string, string | string[] | undefined>

type RawFetch<Flow> = (
  client: FrontendApi,
  request: { id: string; cookie?: string }
) => Promise<{ value: () => Promise<Flow> }>

async function getServerFlow<Flow>(
  params: FlowParams,
  fetchRaw: RawFetch<Flow>,
  flowType: FlowType,
  uiUrl: string
): Promise<Flow | null> {
  const origin = await dashboardOrigin()
  const query = stringParams(params)

  const startNewFlow = (): never =>
    redirect(
      new URL(
        `/self-service/${flowType}/browser?${new URLSearchParams(query)}`,
        origin
      ).toString(),
      RedirectType.replace
    )

  const onRestartFlow = (useFlowId?: string): never => {
    if (!useFlowId) return startNewFlow()
    const target = new URL(uiUrl, origin)
    target.search = new URLSearchParams({ ...query, flow: useFlowId }).toString()
    return redirect(target.toString(), RedirectType.replace)
  }

  const flowId = params.flow?.toString()
  if (!flowId) return startNewFlow()

  const cookie = (await headers()).get('cookie') ?? undefined

  try {
    const raw = await fetchRaw(serverFrontendClient(), { id: flowId, cookie })
    const flow = await raw.value()
    const publicUrl = publicKratosUrl()
    return publicUrl
      ? (JSON.parse(
          JSON.stringify(flow).replaceAll(publicUrl, origin)
        ) as Flow)
      : flow
  } catch (error) {
    const handler = handleFlowError({
      onValidationError: (value) => value as Flow,
      onRestartFlow,
      onRedirect: (url) => redirect(url),
    })
    return ((await handler(error)) as Flow | undefined) ?? null
  }
}

function stringParams(params: FlowParams): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') out[key] = value
  }
  return out
}

const initOverrides = { cache: 'no-cache' } as const

export function getServerLoginFlow(
  params: FlowParams
): Promise<LoginFlow | null> {
  return getServerFlow(
    params,
    (client, request) => client.getLoginFlowRaw(request, initOverrides),
    FlowType.Login,
    oryConfig.project.login_ui_url
  )
}

export function getServerRegistrationFlow(
  params: FlowParams
): Promise<RegistrationFlow | null> {
  return getServerFlow(
    params,
    (client, request) => client.getRegistrationFlowRaw(request, initOverrides),
    FlowType.Registration,
    oryConfig.project.registration_ui_url
  )
}

export function getServerRecoveryFlow(
  params: FlowParams
): Promise<RecoveryFlow | null> {
  return getServerFlow(
    params,
    (client, request) => client.getRecoveryFlowRaw(request, initOverrides),
    FlowType.Recovery,
    oryConfig.project.recovery_ui_url
  )
}

export function getServerVerificationFlow(
  params: FlowParams
): Promise<VerificationFlow | null> {
  return getServerFlow(
    params,
    (client, request) => client.getVerificationFlowRaw(request, initOverrides),
    FlowType.Verification,
    oryConfig.project.verification_ui_url
  )
}

export function getServerSettingsFlow(
  params: FlowParams
): Promise<SettingsFlow | null> {
  return getServerFlow(
    params,
    (client, request) => client.getSettingsFlowRaw(request, initOverrides),
    FlowType.Settings,
    oryConfig.project.settings_ui_url
  )
}

// Server-side whoami over the INTERNAL Kratos URL (same loop avoidance as the
// flow getters). Replaces @ory/nextjs's getServerSession, which fetches the
// public SDK URL. Returns null when there is no active session.
export async function getServerKratosSession(): Promise<Session | null> {
  const cookie = (await headers()).get('cookie') ?? undefined
  return serverFrontendClient()
    .toSession({ cookie })
    .catch(() => null)
}
