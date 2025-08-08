import micromatch from 'micromatch'

interface DashboardPageConfig {
  title: string
  description: string
  type?: 'default' | 'custom'
}

const DASHBOARD_PAGE_CONFIGS: Record<string, DashboardPageConfig> = {
  '/dashboard/*/sandboxes': {
    title: 'Sandboxes',
    description: "Manage your team's sandboxes",
    type: 'custom',
  },
  '/dashboard/*/sandboxes/**/*': {
    title: 'Sandbox',
    description: "Manage your team's sandbox",
    type: 'custom',
  },
  '/dashboard/*/templates': {
    title: 'Templates',
    description: "Manage your team's templates",
    type: 'custom',
  },
  '/dashboard/*/usage': {
    title: 'Usage',
    description: "Manage your team's usage",
    type: 'default',
  },
  '/dashboard/*/team': {
    title: 'Team',
    description: "Manage your team's settings",
    type: 'default',
  },
  '/dashboard/*/keys': {
    title: 'Keys',
    description: "Manage your team's keys",
    type: 'default',
  },
  '/dashboard/*/billing': {
    title: 'Billing',
    description: "Manage your team's billing",
    type: 'default',
  },
  '/dashboard/*/budget': {
    title: 'Budget',
    description: "Manage your team's budget",
    type: 'default',
  },
  '/dashboard/account': {
    title: 'Account',
    description: "Manage your account's settings",
    type: 'default',
  },
}

export const getDashboardPageConfig = (pathname: string) => {
  for (const [pattern, config] of Object.entries(DASHBOARD_PAGE_CONFIGS)) {
    if (micromatch.isMatch(pathname, pattern)) {
      return config
    }
  }
}
