import { l } from '@/lib/clients/logger/logger'
import micromatch from 'micromatch'
import { PROTECTED_URLS } from './urls'

export interface TitleSegment {
  label: string
  href?: string
}

/**
 * Layout configuration for dashboard pages.
 */
export interface DashboardLayoutConfig {
  title: string | TitleSegment[]
  type: 'default' | 'custom'
  custom?: {
    includeHeaderBottomStyles: boolean
  }
}

const DASHBOARD_LAYOUT_CONFIGS: Record<
  string,
  (pathname: string) => DashboardLayoutConfig
> = {
  // base
  '/dashboard/*/sandboxes': () => ({
    title: 'Sandboxes',
    type: 'custom',
  }),
  '/dashboard/*/sandboxes/**/*': () => ({
    title: 'Sandbox',
    type: 'custom',
  }),
  '/dashboard/*/templates': () => ({
    title: 'Templates',
    type: 'custom',
  }),
  '/dashboard/*/templates/*/builds/*': (pathname) => {
    const parts = pathname.split('/')
    const teamIdOrSlug = parts[2]!
    const buildId = parts.pop()!
    const buildIdSliced = `${buildId.slice(0, 6)}...${buildId.slice(-6)}`

    return {
      title: [
        {
          label: 'Templates',
          href: PROTECTED_URLS.TEMPLATES_BUILDS(teamIdOrSlug),
        },
        { label: `Build ${buildIdSliced}` },
      ],
      type: 'custom',
      custom: {
        includeHeaderBottomStyles: true,
      },
    }
  },

  // integrations
  '/dashboard/*/webhooks': () => ({
    title: 'Webhooks',
    type: 'default',
  }),

  // team
  '/dashboard/*/general': () => ({
    title: 'General',
    type: 'default',
  }),
  '/dashboard/*/keys': () => ({
    title: 'API Keys',
    type: 'default',
  }),
  '/dashboard/*/members': () => ({
    title: 'Members',
    type: 'default',
  }),

  // billing
  '/dashboard/*/usage': () => ({
    title: 'Usage',
    type: 'custom',
    custom: {
      includeHeaderBottomStyles: true,
    },
  }),
  '/dashboard/*/limits': () => ({
    title: 'Limits',
    type: 'default',
  }),
  '/dashboard/*/billing': () => ({
    title: 'Billing',
    type: 'default',
  }),
  '/dashboard/*/billing/plan': (pathname) => {
    const parts = pathname.split('/')
    const teamIdOrSlug = parts[2]!

    return {
      title: [
        { label: 'Billing', href: PROTECTED_URLS.BILLING(teamIdOrSlug) },
        {
          label: 'Plan & Add-ons',
        },
      ],
      type: 'default',
    }
  },
  '/dashboard/*/billing/plan/select': (pathname) => {
    const parts = pathname.split('/')
    const teamIdOrSlug = parts[2]!

    return {
      title: [
        { label: 'Billing', href: PROTECTED_URLS.BILLING(teamIdOrSlug) },
        {
          label: 'Plan & Add-ons',
          href: PROTECTED_URLS.BILLING_PLAN(teamIdOrSlug),
        },
        { label: 'Change Plan' },
      ],
      type: 'default',
    }
  },

  '/dashboard/*/account': () => ({
    title: 'Account',
    type: 'default',
  }),
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
      return config(pathname)
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
