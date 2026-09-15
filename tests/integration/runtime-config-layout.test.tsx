import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DashboardLayout from '@/app/(dashboard)/layout'
import { useClientConfig } from '@/features/client-config-provider'

const request = vi.hoisted(() => ({ headers: new Headers() }))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => request.headers,
}))
vi.mock('@/core/server/auth', () => ({ getApiKey: async () => 'e2b_test_key' }))
vi.mock('@/features/dashboard/sidebar/sidebar', () => ({ default: () => null }))
vi.mock('@/features/dashboard/layouts/layout', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/features/dashboard/timezone/context', () => ({
  TimezoneProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/ui/primitives/sidebar', () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => children,
  SidebarInset: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/ui/error', () => ({
  CatchErrorBoundary: ({ children }: { children: ReactNode }) => children,
}))

function ConfigConsumer() {
  const { domain, sandboxUrl } = useClientConfig()
  return (
    <output>
      {domain}|{sandboxUrl}
    </output>
  )
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('dashboard layout runtime config', () => {
  it('delivers request-time values to a client consumer on its first render without fetching config', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    vi.stubEnv('NEXT_PUBLIC_E2B_DOMAIN', 'build.example')
    vi.stubEnv('E2B_API_KEY', 'e2b_test_private_key')
    vi.stubEnv('E2B_INFRA_API_URL', 'http://infra-api.internal:3000')
    vi.stubEnv('E2B_DASHBOARD_API_URL', 'http://dashboard-api.internal:3010')

    for (const domain of ['first.example', 'second.example']) {
      vi.stubEnv('PUBLIC_E2B_DOMAIN', domain)
      vi.stubEnv('PUBLIC_SANDBOX_URL', `https://sandbox.${domain}`)
      const layout = await DashboardLayout({ children: <ConfigConsumer /> })

      expect(layout.props.value).toEqual({
        domain,
        sandboxUrl: `https://sandbox.${domain}`,
      })
      const html = renderToStaticMarkup(layout)
      expect(html).toContain(
        `<output>${domain}|https://sandbox.${domain}</output>`
      )
      expect(html).not.toMatch(
        /build\.example|e2b_test_private_key|infra-api\.internal|dashboard-api\.internal/
      )
    }
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps host-derived sandbox URLs isolated between requests', async () => {
    vi.stubEnv('PUBLIC_E2B_DOMAIN', 'cluster.example')
    vi.stubEnv('PUBLIC_SANDBOX_URL', '')
    vi.stubEnv('E2B_SANDBOX_URL', '')
    vi.stubEnv('NEXT_PUBLIC_E2B_SANDBOX_URL', '')
    vi.stubEnv('E2B_INFRA_API_URL', 'http://infra-api.internal:3000')

    for (const host of ['192.0.2.1', '192.0.2.2']) {
      request.headers = new Headers({
        host: 'dashboard.internal:3001',
        'x-forwarded-host': `${host}:8443`,
        'x-forwarded-proto': 'https',
      })
      const layout = await DashboardLayout({ children: <ConfigConsumer /> })

      expect(renderToStaticMarkup(layout)).toContain(
        `<output>cluster.example|https://${host}:3002</output>`
      )
    }
  })
})
