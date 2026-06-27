import type { OryClientConfiguration } from '@ory/elements-react'
import { headers } from 'next/headers'
import oryConfig from '@/configs/ory'

// Returns oryConfig with sdk.url set to this request's origin, so the Elements
// client posts /self-service/* same-origin through the proxy. Mirrors
// @ory/nextjs's internal getPublicUrl() (host + x-forwarded-proto), which isn't
// exported. Server-only (reads next/headers); used by the flow pages.
export async function getOryConfigForRequest(): Promise<OryClientConfiguration> {
  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
  if (!host) return oryConfig

  // Behind E2B's HTTPS-only ingress the forwarded proto is literally `http`;
  // for a public (non-loopback) host force https so the client SDK URL the
  // Elements form fetches against is the same-origin https dashboard URL.
  const hostname = host.split(':')[0] ?? host
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1'
  const forwardedProto = requestHeaders.get('x-forwarded-proto') ?? 'http'
  const proto = !isLoopback && forwardedProto === 'http' ? 'https' : forwardedProto
  return { ...oryConfig, sdk: { ...oryConfig.sdk, url: `${proto}://${host}` } }
}
