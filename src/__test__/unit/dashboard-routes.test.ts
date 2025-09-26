import {
  ACCOUNT_ROUTE,
  DASHBOARD_ROUTES,
  getGroupedRoutes,
  getPageConfig,
  getRouteById,
} from '@/configs/dashboard-routes'
import { describe, expect, it } from 'vitest'

describe('Dashboard Routes', () => {
  describe('getRouteById', () => {
    it('returns correct route for valid dashboard route ID', () => {
      const route = getRouteById('sandboxes')
      expect(route).toBeDefined()
      expect(route?.id).toBe('sandboxes')
      expect(route?.label).toBe('Sandboxes')
      expect(route?.path).toBeDefined()
      expect(route?.tabs).toBeDefined()
      expect(route?.tabs?.length).toBeGreaterThan(0)
    })

    it('returns account route for account ID', () => {
      const route = getRouteById('account')
      expect(route).toBeDefined()
      expect(route?.id).toBe('account')
      expect(route?.label).toBe('Account Settings')
      expect(route).toEqual(ACCOUNT_ROUTE)
    })

    it('returns undefined for non-existent route ID', () => {
      const route = getRouteById('non-existent')
      expect(route).toBeUndefined()
    })

    it('handles empty string gracefully', () => {
      const route = getRouteById('')
      expect(route).toBeUndefined()
    })
  })

  describe('getPageConfig', () => {
    it('returns correct config for sandboxes route', () => {
      const config = getPageConfig('/dashboard/team123/sandboxes')
      expect(config).toBeDefined()
      expect(config?.title).toBe('Sandboxes')
      expect(config?.type).toBe('custom')
    })

    it('returns correct config for account route', () => {
      const config = getPageConfig('/dashboard/account')
      expect(config).toBeDefined()
      expect(config?.title).toBe('Account')
      expect(config?.type).toBe('default')
    })

    it('returns specific sandbox sub-route config', () => {
      const config = getPageConfig('/dashboard/team123/sandboxes/sb123/inspect')
      expect(config).toBeDefined()
      expect(config?.title).toBe('Sandbox')
      expect(config?.type).toBe('custom')
      expect(config?.description).toBe("Manage your team's sandbox")
    })

    it('returns null for non-existent route', () => {
      const config = getPageConfig('/dashboard/non-existent')
      expect(config).toBeNull()
    })

    it('handles malformed paths gracefully', () => {
      const config = getPageConfig('/invalid/path')
      expect(config).toBeNull()
    })
  })

  describe('getGroupedRoutes', () => {
    it('returns correctly grouped routes', () => {
      const grouped = getGroupedRoutes()

      expect(grouped).toBeDefined()
      expect(grouped.ungrouped).toBeDefined()
      expect(grouped.team).toBeDefined()
      expect(grouped.expenses).toBeDefined()

      // Check that ungrouped contains routes without a group
      expect(grouped.ungrouped!.length).toBeGreaterThan(0)
      grouped.ungrouped!.forEach((route) => {
        expect(route.group).toBeUndefined()
      })

      // Check that team group exists and contains routes
      if (grouped.team!.length > 0) {
        grouped.team!.forEach((route) => {
          expect(route.group).toBe('team')
        })
      }

      // Check that expenses group exists (if billing is enabled)
      if (grouped.expenses!.length > 0) {
        grouped.expenses!.forEach((route) => {
          expect(route.group).toBe('expenses')
        })
      }

      // Verify all routes are accounted for
      const totalRoutes =
        grouped.ungrouped!.length +
        grouped.team!.length +
        grouped.expenses!.length
      expect(totalRoutes).toBe(DASHBOARD_ROUTES.length)
    })

    it('correctly categorizes specific routes', () => {
      const grouped = getGroupedRoutes()

      // Sandboxes and templates should be ungrouped
      const sandboxesRoute = grouped.ungrouped!.find(
        (r) => r.id === 'sandboxes'
      )
      const templatesRoute = grouped.ungrouped!.find(
        (r) => r.id === 'templates'
      )
      expect(sandboxesRoute).toBeDefined()
      expect(templatesRoute).toBeDefined()

      // Members and settings should be in team group
      const membersRoute = grouped.team!.find((r) => r.id === 'members')
      const settingsRoute = grouped.team!.find((r) => r.id === 'settings')
      expect(membersRoute).toBeDefined()
      expect(settingsRoute).toBeDefined()
    })
  })

  describe('Route Structure Validation', () => {
    it('all dashboard routes have required properties', () => {
      DASHBOARD_ROUTES.forEach((route) => {
        expect(route.id).toBeTruthy()
        expect(route.label).toBeTruthy()
        expect(route.icon).toBeDefined()
        expect(route.path).toBeDefined()
        expect(route.activePattern).toBeTruthy()
        expect(route.pageConfig).toBeDefined()
        expect(route.pageConfig.title).toBeTruthy()
        expect(route.pageConfig.description).toBeTruthy()
        expect(route.pageConfig.type).toMatch(/^(default|custom)$/)
      })
    })

    it('account route has required properties', () => {
      expect(ACCOUNT_ROUTE.id).toBe('account')
      expect(ACCOUNT_ROUTE.label).toBeTruthy()
      expect(ACCOUNT_ROUTE.icon).toBeDefined()
      expect(ACCOUNT_ROUTE.path).toBeDefined()
      expect(ACCOUNT_ROUTE.activePattern).toBeTruthy()
      expect(ACCOUNT_ROUTE.pageConfig).toBeDefined()
    })

    it('sandboxes route has proper tabs configuration', () => {
      const sandboxesRoute = DASHBOARD_ROUTES.find((r) => r.id === 'sandboxes')
      expect(sandboxesRoute).toBeDefined()
      expect(sandboxesRoute?.tabs).toBeDefined()
      expect(sandboxesRoute?.tabs?.length).toBeGreaterThan(0)

      // Check tabs structure
      sandboxesRoute?.tabs?.forEach((tab) => {
        expect(tab.id).toBeTruthy()
        expect(tab.label).toBeTruthy()
        expect(tab.parallelSegment).toBeTruthy()
        expect(tab.parallelSegment).toMatch(/^@/)
      })

      // Check default tab exists
      const defaultTab = sandboxesRoute?.tabs?.find((t) => t.isDefault)
      expect(defaultTab).toBeDefined()
    })

    it('path functions generate correct URLs', () => {
      const testTeamId = 'test-team-123'

      DASHBOARD_ROUTES.forEach((route) => {
        const path = route.path(testTeamId)
        expect(path).toMatch(/^\/dashboard\//)
        expect(path).toContain(testTeamId)
      })

      // Test account route (ignores team ID)
      const accountPath = ACCOUNT_ROUTE.path('')
      expect(accountPath).toBe('/dashboard/account')
    })
  })
})
