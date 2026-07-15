import type { BooleanFeatureFlagId } from '@/core/modules/feature-flags/definitions'
import {
  AccountSettingsIcon,
  CardIcon,
  GaugeIcon,
  type Icon,
  IntegrationsIcon,
  KeyIcon,
  PersonsIcon,
  SandboxIcon,
  SettingsIcon,
  TemplateIcon,
  TerminalIcon,
  UsageIcon,
  WebhookIcon,
} from '@/ui/primitives/icons'
import { INCLUDE_ARGUS, INCLUDE_BILLING } from './env-flags'
import { PROTECTED_URLS } from './urls'

type SidebarNavArgs = {
  teamSlug?: string
}

export type SidebarNavItem = {
  label: string
  href: (args: SidebarNavArgs) => string
  icon: Icon
  group?: string
  activeMatch?: string
  featureFlag?: BooleanFeatureFlagId
}

export const SIDEBAR_MAIN_LINKS: SidebarNavItem[] = [
  // Base
  {
    label: 'Sandboxes',
    href: (args) => PROTECTED_URLS.SANDBOXES(args.teamSlug!),
    icon: SandboxIcon,
    activeMatch: `/dashboard/*/sandboxes/**`,
  },
  {
    label: 'Templates',
    href: (args) => PROTECTED_URLS.TEMPLATES(args.teamSlug!),
    icon: TemplateIcon,
    activeMatch: `/dashboard/*/templates/**`,
  },

  // Integration
  {
    label: 'Agents',
    group: 'integration',
    href: (args) => PROTECTED_URLS.AGENTS(args.teamSlug!),
    icon: TerminalIcon,
    activeMatch: `/dashboard/*/agents`,
    featureFlag: 'agentsEnabled',
  },
  {
    label: 'Connections',
    group: 'integration',
    href: (args) => PROTECTED_URLS.CONNECTIONS(args.teamSlug!),
    icon: IntegrationsIcon,
    activeMatch: `/dashboard/*/connections`,
    featureFlag: 'connectionsEnabled',
  },
  ...(INCLUDE_ARGUS
    ? [
        {
          label: 'Webhooks',
          group: 'integration',
          href: (args: SidebarNavArgs) =>
            PROTECTED_URLS.WEBHOOKS(args.teamSlug!),
          icon: WebhookIcon,
          activeMatch: `/dashboard/*/webhooks/**`,
        },
      ]
    : []),

  // Team
  {
    label: 'General',
    href: (args) => PROTECTED_URLS.GENERAL(args.teamSlug!),
    icon: SettingsIcon,
    group: 'team',
    activeMatch: `/dashboard/*/general`,
  },
  {
    label: 'API Keys',
    href: (args) => PROTECTED_URLS.KEYS(args.teamSlug!),
    icon: KeyIcon,
    group: 'team',
    activeMatch: `/dashboard/*/keys`,
  },
  {
    label: 'Members',
    href: (args) => PROTECTED_URLS.MEMBERS(args.teamSlug!),
    icon: PersonsIcon,
    group: 'team',
    activeMatch: `/dashboard/*/members`,
  },

  // Billing
  ...(INCLUDE_BILLING
    ? [
        {
          label: 'Usage',
          href: (args: SidebarNavArgs) => PROTECTED_URLS.USAGE(args.teamSlug!),
          icon: UsageIcon,
          group: 'billing',
          activeMatch: `/dashboard/*/usage/**`,
        },
        {
          label: 'Limits',
          href: (args: SidebarNavArgs) => PROTECTED_URLS.LIMITS(args.teamSlug!),
          group: 'billing',
          icon: GaugeIcon,
          activeMatch: `/dashboard/*/limits/**`,
        },
        {
          label: 'Billing',
          href: (args: SidebarNavArgs) =>
            PROTECTED_URLS.BILLING(args.teamSlug!),
          icon: CardIcon,
          group: 'billing',
          activeMatch: `/dashboard/*/billing/**`,
        },
      ]
    : []),
]

export const SIDEBAR_EXTRA_LINKS: SidebarNavItem[] = [
  {
    label: 'Account Settings',
    href: () => PROTECTED_URLS.ACCOUNT_SETTINGS,
    icon: AccountSettingsIcon,
  },
]

export const SIDEBAR_ALL_LINKS = [...SIDEBAR_MAIN_LINKS, ...SIDEBAR_EXTRA_LINKS]

export function filterSidebarLinks(
  links: SidebarNavItem[],
  isEnabled: (flagId: BooleanFeatureFlagId) => boolean
) {
  return links.filter(
    (link) => !link.featureFlag || isEnabled(link.featureFlag)
  )
}
