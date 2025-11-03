import { l } from '@/lib/clients/logger/logger'
import micromatch from 'micromatch'

/**
 * Layout configuration for dashboard pages.
 */
export interface DashboardLayoutConfig {
  title: string
  type: 'default' | 'custom'
  custom?: {
    includeHeaderBottomStyles: boolean
  }
}

const DASHBOARD_LAYOUT_CONFIGS: Record<string, DashboardLayoutConfig> = {
  '/dashboard/*/sandboxes': {
    title: 'Sandboxes',
    type: 'custom',
  },
  '/dashboard/*/sandboxes/**/*': {
    title: 'Sandbox',
    type: 'custom',
  },
  '/dashboard/*/templates': {
    title: 'Templates',
    type: 'custom',
  },
  '/dashboard/*/usage': {
    title: 'Usage',
    type: 'custom',
    custom: {
      includeHeaderBottomStyles: true,
    },
  },
  '/dashboard/*/members': {
    title: 'Members',
    type: 'default',
  },
  '/dashboard/*/keys': {
    title: 'API Keys',
    type: 'default',
  },
  '/dashboard/*/general': {
    title: 'General',
    type: 'default',
  },
  '/dashboard/*/billing': {
    title: 'Billing',
    type: 'default',
  },
  '/dashboard/*/budget': {
    title: 'Budget',
    type: 'default',
  },
  '/dashboard/account': {
    title: 'Account',
    type: 'default',
  },
}

/**
 * Returns the layout config for a given dashboard pathname.
 * @param pathname - The current route pathname
 */
export const getDashboardLayoutConfig = (
  pathname: string
): DashboardLayoutConfig => {
  for (const [pattern, config] of Object.entries(DASHBOARD_LAYOUT_CONFIGS)) {
    if (micromatch.isMatch(pathname, pattern)) {
      return config
    }
  }

  l.error(
    {
      key: 'layout_config:no_layout_config_found',
      context: {
        pathname,
      },
    },
    `No layout config found for pathname: ${pathname}`
  )

  return {
    title: 'Dashboard',
    type: 'default',
  }
}
