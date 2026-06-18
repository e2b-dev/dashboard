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
  '/dashboard/*/sandboxes/monitoring': () => ({
    title: 'Sandboxes',
    type: 'custom',
  }),
  '/dashboard/*/sandboxes/list': () => ({
    title: 'Sandboxes',
    type: 'custom',
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
  '/dashboard/*/templates/list': () => ({
    title: 'Templates',
    type: 'custom',
  }),
  '/dashboard/*/templates/builds': () => ({
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
  '/dashboard/*/templates/*/overview': (pathname) =>
    templateDetailLayoutConfig(pathname),
  '/dashboard/*/templates/*/tags': (pathname) =>
    templateDetailLayoutConfig(pathname),
  '/dashboard/*/templates/*/tags/*': (pathname) =>
    templateDetailLayoutConfig(pathname),
  // Keep this more specific glob ahead of /templates/*/builds/* (build detail).
  '/dashboard/*/templates/*/builds': (pathname) =>
    templateDetailLayoutConfig(pathname),

  // integrations
  '/dashboard/*/webhooks': () => ({
    title: 'Webhooks',
    type: 'default',
  }),
  '/dashboard/*/webhooks/*/overview': (pathname) =>
    webhookDetailLayoutConfig(pathname),
  '/dashboard/*/webhooks/*/deliveries': (pathname) =>
    webhookDetailLayoutConfig(pathname),

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

// Pathname fallback for detail tabs; usePageTitle replaces with the friendly template name once data loads.
function templateDetailLayoutConfig(pathname: string): DashboardLayoutConfig {
  const parts = pathname.split('/')
  const teamSlug = parts[2]!
  const templateId = parts[4]!
  const templateIdSliced =
    templateId.length > 14
      ? `${templateId.slice(0, 6)}...${templateId.slice(-6)}`
      : templateId

  return {
    title: [
      {
        label: 'Templates',
        href: PROTECTED_URLS.TEMPLATES_LIST(teamSlug),
      },
      { label: templateIdSliced },
    ],
    type: 'custom',
    copyValue: templateId,
  }
}

function webhookDetailLayoutConfig(pathname: string): DashboardLayoutConfig {
  const parts = pathname.split('/')
  const teamSlug = parts[2] ?? ''
  const webhookId = parts[4] ?? ''
  const webhookIdSliced = `${webhookId.slice(0, 6)}...${webhookId.slice(-6)}`

  return {
    title: [
      {
        label: 'Webhooks',
        href: PROTECTED_URLS.WEBHOOKS(teamSlug),
      },
      { label: webhookIdSliced },
    ],
    type: 'custom',
    copyValue: webhookId,
    custom: {
      includeHeaderBottomStyles: true,
    },
  }
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
