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
  // sandboxes
  '/sandboxes': () => ({
    title: 'Sandboxes',
    type: 'custom',
  }),
  '/sandboxes/*/*': (pathname) => {
    const parts = pathname.split('/')
    const sandboxId = parts[2]!

    return {
      title: [
        {
          label: 'Sandboxes',
          href: PROTECTED_URLS.SANDBOXES,
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

  // templates
  '/templates': () => ({
    title: 'Templates',
    type: 'custom',
  }),
  '/templates/list': () => ({
    title: 'Templates',
    type: 'custom',
  }),
  '/templates/builds': () => ({
    title: 'Templates',
    type: 'custom',
  }),
  '/templates/*/builds/*': (pathname) => {
    const parts = pathname.split('/')
    const buildId = parts.pop()!
    const buildIdSliced = `${buildId.slice(0, 6)}...${buildId.slice(-6)}`

    return {
      title: [
        {
          label: 'Templates',
          href: PROTECTED_URLS.TEMPLATES_BUILDS,
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
  '/templates/*/overview': (pathname) => templateDetailLayoutConfig(pathname),
  '/templates/*/tags': (pathname) => templateDetailLayoutConfig(pathname),
  '/templates/*/tags/*': (pathname) => templateDetailLayoutConfig(pathname),
  // Keep this more specific glob ahead of /templates/*/builds/* (build detail).
  '/templates/*/builds': (pathname) => templateDetailLayoutConfig(pathname),
}

// Pathname fallback for detail tabs; usePageTitle replaces with the friendly template name once data loads.
function templateDetailLayoutConfig(pathname: string): DashboardLayoutConfig {
  const parts = pathname.split('/')
  const templateId = parts[2]!
  const templateIdSliced =
    templateId.length > 14
      ? `${templateId.slice(0, 6)}...${templateId.slice(-6)}`
      : templateId

  return {
    title: [
      {
        label: 'Templates',
        href: PROTECTED_URLS.TEMPLATES_LIST,
      },
      { label: templateIdSliced },
    ],
    type: 'custom',
    copyValue: templateId,
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
