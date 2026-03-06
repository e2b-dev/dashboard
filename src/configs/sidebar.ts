import {
  AccountSettingsIcon,
  CardIcon,
  GaugeIcon,
  KeyIcon,
  PersonsIcon,
  SandboxIcon,
  SettingsIcon,
  TemplateIcon,
  UsageIcon,
  WebhookIcon,
} from '@/ui/primitives/icons'
import { JSX } from 'react'
import { INCLUDE_ARGUS, INCLUDE_BILLING } from './flags'
import { PROTECTED_URLS } from './urls'

type SidebarNavArgs = {
  teamIdOrSlug?: string
}

export type SidebarNavItem = {
  label: string
  href: (args: SidebarNavArgs) => string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: (...args: any[]) => JSX.Element
  group?: string
  activeMatch?: string
}

export const SIDEBAR_MAIN_LINKS: SidebarNavItem[] = [
  // Base
  {
    label: 'Sandboxes',
    href: (args) => PROTECTED_URLS.SANDBOXES(args.teamIdOrSlug!),
    icon: SandboxIcon,
    activeMatch: `/dashboard/*/sandboxes/**`,
  },
  {
    label: 'Templates',
    href: (args) => PROTECTED_URLS.TEMPLATES(args.teamIdOrSlug!),
    icon: TemplateIcon,
    activeMatch: `/dashboard/*/templates/**`,
  },

  // Integrations
  ...(INCLUDE_ARGUS
    ? [
        {
          label: 'Webhooks',
          group: 'integration',
          href: (args: SidebarNavArgs) =>
            PROTECTED_URLS.WEBHOOKS(args.teamIdOrSlug!),
          icon: WebhookIcon,
          activeMatch: `/dashboard/*/webhooks`,
        },
      ]
    : []),

  // Team
  {
    label: 'General',
    href: (args) => PROTECTED_URLS.GENERAL(args.teamIdOrSlug!),
    icon: SettingsIcon,
    group: 'team',
    activeMatch: `/dashboard/*/general`,
  },
  {
    label: 'API Keys',
    href: (args) => PROTECTED_URLS.KEYS(args.teamIdOrSlug!),
    icon: KeyIcon,
    group: 'team',
    activeMatch: `/dashboard/*/keys`,
  },
  {
    label: 'Members',
    href: (args) => PROTECTED_URLS.MEMBERS(args.teamIdOrSlug!),
    icon: PersonsIcon,
    group: 'team',
    activeMatch: `/dashboard/*/members`,
  },

  // Billing
  ...(INCLUDE_BILLING
    ? [
        {
          label: 'Usage',
          href: (args: SidebarNavArgs) =>
            PROTECTED_URLS.USAGE(args.teamIdOrSlug!),
          icon: UsageIcon,
          group: 'billing',
          activeMatch: `/dashboard/*/usage/**`,
        },
        {
          label: 'Limits',
          href: (args: SidebarNavArgs) =>
            PROTECTED_URLS.LIMITS(args.teamIdOrSlug!),
          group: 'billing',
          icon: GaugeIcon,
          activeMatch: `/dashboard/*/limits/**`,
        },
        {
          label: 'Billing',
          href: (args: SidebarNavArgs) =>
            PROTECTED_URLS.BILLING(args.teamIdOrSlug!),
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
