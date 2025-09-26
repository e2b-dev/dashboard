/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ListIcon,
  PersonsIcon,
  SandboxIcon,
  SettingsIcon,
  TemplateIcon,
  UsageIcon,
} from '@/ui/primitives/icons'
import {
  ActivityIcon,
  CreditCardIcon,
  DollarSignIcon,
  UserIcon,
} from 'lucide-react'
import micromatch from 'micromatch'
import { INCLUDE_BILLING } from './flags'

// route tab configuration
export interface RouteTab {
  id: string
  label: string
  icon?: React.ComponentType<any>
  // path segment for parallel routing (@monitoring, @list)
  parallelSegment: string
  // default tab when no query param is present
  isDefault?: boolean
}

// main route configuration
export interface DashboardRoute {
  id: string
  label: string
  icon: React.ComponentType<any>

  // routing
  path: (teamIdOrSlug: string) => string
  activePattern: string // micromatch pattern for active state

  // sidebar grouping
  group?: 'team' | 'expenses'

  // tabs configuration
  tabs?: RouteTab[]

  // page metadata
  pageConfig: {
    title: string
    description: string
    type?: 'default' | 'custom'
  }
}

// centralized route definitions
export const DASHBOARD_ROUTES: DashboardRoute[] = [
  {
    id: 'sandboxes',
    label: 'Sandboxes',
    icon: SandboxIcon,
    path: (teamId) => `/dashboard/${teamId}/sandboxes`,
    activePattern: '/dashboard/*/sandboxes/**',
    tabs: [
      {
        id: 'monitoring',
        label: 'Monitoring',
        icon: ActivityIcon,
        parallelSegment: '@monitoring',
        isDefault: true,
      },
      {
        id: 'list',
        label: 'List',
        icon: ListIcon,
        parallelSegment: '@list',
      },
    ],
    pageConfig: {
      title: 'Sandboxes',
      description: "Manage your team's sandboxes",
      type: 'custom' as const,
    },
  },
  {
    id: 'templates',
    label: 'Templates',
    icon: TemplateIcon,
    path: (teamId) => `/dashboard/${teamId}/templates`,
    activePattern: '/dashboard/*/templates',
    pageConfig: {
      title: 'Templates',
      description: "Manage your team's templates",
      type: 'custom' as const,
    },
  },
  ...(INCLUDE_BILLING
    ? [
        {
          id: 'usage',
          label: 'Usage',
          icon: UsageIcon,
          path: (teamId: string) => `/dashboard/${teamId}/usage`,
          activePattern: '/dashboard/*/usage/**',
          pageConfig: {
            title: 'Usage',
            description: "Monitor your team's usage",
            type: 'default' as const,
          },
        },
      ]
    : []),
  {
    id: 'members',
    label: 'Members',
    icon: PersonsIcon,
    path: (teamId) => `/dashboard/${teamId}/members`,
    activePattern: '/dashboard/*/members/**',
    group: 'team' as const,
    pageConfig: {
      title: 'Members',
      description: 'Manage team members',
      type: 'default' as const,
    },
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: SettingsIcon,
    path: (teamId) => `/dashboard/${teamId}/settings`,
    activePattern: '/dashboard/*/settings/**',
    group: 'team' as const,
    tabs: [
      {
        id: 'general',
        label: 'General',
        parallelSegment: '@general',
        isDefault: true,
      },
      {
        id: 'keys',
        label: 'API Keys',
        parallelSegment: '@keys',
      },
    ],
    pageConfig: {
      title: 'Settings',
      description: 'Team settings',
      type: 'custom' as const,
    },
  },
  // note: keys and team routes are handled by settings now
  // they can be added as tabs if needed in the future
  ...(INCLUDE_BILLING
    ? [
        {
          id: 'billing',
          label: 'Billing',
          icon: DollarSignIcon,
          path: (teamId: string) => `/dashboard/${teamId}/billing`,
          activePattern: '/dashboard/*/billing/**',
          group: 'expenses' as const,
          pageConfig: {
            title: 'Billing',
            description: 'Manage billing',
            type: 'default' as const,
          },
        },
        {
          id: 'budget',
          label: 'Budget',
          icon: CreditCardIcon,
          path: (teamId: string) => `/dashboard/${teamId}/budget`,
          activePattern: '/dashboard/*/budget/**',
          group: 'expenses' as const,
          pageConfig: {
            title: 'Budget',
            description: 'Manage budget',
            type: 'default' as const,
          },
        },
      ]
    : []),
]

// account route (special case, no team context)
export const ACCOUNT_ROUTE: DashboardRoute = {
  id: 'account',
  label: 'Account Settings',
  icon: UserIcon,
  path: (_teamIdOrSlug: string) => '/dashboard/account', // account route ignores team context
  activePattern: '/dashboard/account',
  pageConfig: {
    title: 'Account',
    description: 'Manage your account settings',
    type: 'default' as const,
  },
}

// helper functions
export function getRouteById(id: string): DashboardRoute | undefined {
  return (
    DASHBOARD_ROUTES.find((r) => r.id === id) ||
    (id === 'account' ? ACCOUNT_ROUTE : undefined)
  )
}

// get page config for current pathname
export function getPageConfig(pathname: string) {
  const allRoutes = [...DASHBOARD_ROUTES, ACCOUNT_ROUTE]

  // check for specific sandbox sub-routes first
  if (micromatch.isMatch(pathname, '/dashboard/*/sandboxes/*/*')) {
    return {
      title: 'Sandbox',
      description: "Manage your team's sandbox",
      type: 'custom' as const,
    }
  }

  for (const route of allRoutes) {
    if (micromatch.isMatch(pathname, route.activePattern)) {
      return route.pageConfig
    }
  }

  return null
}

// get routes grouped for sidebar
export function getGroupedRoutes() {
  const grouped: Record<string, DashboardRoute[]> = {
    ungrouped: [],
    team: [],
    expenses: [],
  }

  DASHBOARD_ROUTES.forEach((route) => {
    const group = route.group || 'ungrouped'
    if (grouped[group]) {
      grouped[group].push(route)
    }
  })

  return grouped
}
