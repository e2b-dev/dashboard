import micromatch from 'micromatch'
import { l } from '@/core/shared/clients/logger/logger'
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
  copyValue?: string
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
  '/dashboard/*/agents': () => ({
    title: 'Agents',
    type: 'default',
  }),
  '/dashboard/*/sandboxes/*/*': (pathname) => {
    const parts = pathname.split('/')
    const teamSlug = parts[2]!
    const sandboxId = parts[4]!

    return {
      title: [
        {
          label: 'Sandboxes',
          href: PROTECTED_URLS.SANDBOXES_LIST(teamSlug),
        },
        { label: sandboxId },
      ],
      type: 'custom',
      copyValue: sandboxId,
      custom: {
        includeHeaderBottomStyles: true,
      },
    }
  },
  '/dashboard/*/templates': () => ({
    title: 'Templates',
    type: 'custom',
  }),
  '/dashboard/*/templates/*/builds/*': (pathname) => {
    const parts = pathname.split('/')
    const teamSlug = parts[2]!
    const buildId = parts.pop()!
    const buildIdSliced = `${buildId.slice(0, 6)}...${buildId.slice(-6)}`

    return {
      title: [
        {
          label: 'Templates',
          href: PROTECTED_URLS.TEMPLATES_BUILDS(teamSlug),
        },
        { label: `Build ${buildIdSliced}` },
      ],
      type: 'custom',
      copyValue: buildId,
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
    const teamSlug = parts[2]!

    return {
      title: [
        { label: 'Billing', href: PROTECTED_URLS.BILLING(teamSlug) },
        {
          label: 'Plan & Add-ons',
        },
      ],
      type: 'default',
    }
  },
  '/dashboard/*/billing/plan/select': (pathname) => {
    const parts = pathname.split('/')
    const teamSlug = parts[2]!

    return {
      title: [
        { label: 'Billing', href: PROTECTED_URLS.BILLING(teamSlug) },
        {
          label: 'Plan & Add-ons',
          href: PROTECTED_URLS.BILLING_PLAN(teamSlug),
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
