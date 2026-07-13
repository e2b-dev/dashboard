import { describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({
  pathname: '/dashboard/team-a/byoc/configuration',
  redirect: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: navigation.redirect,
  usePathname: () => navigation.pathname,
}))
vi.mock('@/features/dashboard/byoc/byoc-deployment-panel', () => ({
  ByocDeploymentPanel: () => null,
}))

import ByocPage from '@/app/dashboard/[teamSlug]/byoc/page'
import { getDashboardLayoutConfig } from '@/configs/layout'
import { ByocDeploymentRouteView } from '@/features/dashboard/byoc/byoc-deployment-route-view'

describe('BYOC route navigation', () => {
  it('defaults the BYOC entry route to Configuration', async () => {
    await ByocPage({ params: Promise.resolve({ teamSlug: 'team-a' }) })

    expect(navigation.redirect).toHaveBeenCalledWith(
      '/dashboard/team-a/byoc/configuration'
    )
  })

  it.each([
    'configuration',
    'infrastructure',
  ])('keeps the BYOC layout on the %s route', (route) => {
    expect(
      getDashboardLayoutConfig(`/dashboard/team-a/byoc/${route}`)
    ).toMatchObject({ title: 'BYOC', type: 'default' })
  })

  it.each([
    ['configuration', 'configuration'],
    ['infrastructure', 'infrastructure'],
  ] as const)('selects the %s panel in the shared layout', (route, view) => {
    navigation.pathname = `/dashboard/team-a/byoc/${route}`

    const element = ByocDeploymentRouteView()

    expect(element.props).toMatchObject({ view })
  })
})
