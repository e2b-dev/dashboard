import { WebhookIcon } from '@/ui/primitives/icons'
import {
  Activity,
  Box,
  Container,
  CreditCard,
  DollarSign,
  Key,
  LucideProps,
  Settings,
  UserRoundCog,
  Users,
} from 'lucide-react'
import { ForwardRefExoticComponent, JSX, RefAttributes } from 'react'
import { INCLUDE_ARGUS, INCLUDE_BILLING } from './flags'
import { PROTECTED_URLS } from './urls'

type SidebarNavArgs = {
  teamIdOrSlug?: string
}

export type SidebarNavItem = {
  label: string
  href: (args: SidebarNavArgs) => string
  icon:
    | ForwardRefExoticComponent<
        Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
      >
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | ((...args: any[]) => JSX.Element)
  group?: string
  activeMatch?: string
}

export const SIDEBAR_MAIN_LINKS: SidebarNavItem[] = [
  // Base
  {
    label: 'Sandboxes',
    href: (args) => PROTECTED_URLS.SANDBOXES(args.teamIdOrSlug!),
    icon: Box,
    activeMatch: `/dashboard/*/sandboxes/**`,
  },
  {
    label: 'Templates',
    href: (args) => PROTECTED_URLS.TEMPLATES(args.teamIdOrSlug!),
    icon: Container,
    activeMatch: `/dashboard/*/templates`,
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
    icon: Settings,
    group: 'team',
    activeMatch: `/dashboard/*/general`,
  },
  {
    label: 'API Keys',
    href: (args) => PROTECTED_URLS.KEYS(args.teamIdOrSlug!),
    icon: Key,
    group: 'team',
    activeMatch: `/dashboard/*/keys`,
  },
  {
    label: 'Members',
    href: (args) => PROTECTED_URLS.MEMBERS(args.teamIdOrSlug!),
    icon: Users,
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
          icon: Activity,
          group: 'billing',
          activeMatch: `/dashboard/*/usage/**`,
        },
        {
          label: 'Budget',
          href: (args: SidebarNavArgs) =>
            PROTECTED_URLS.BUDGET(args.teamIdOrSlug!),
          group: 'billing',
          icon: DollarSign,
          activeMatch: `/dashboard/*/budget/**`,
        },
        {
          label: 'Billing',
          href: (args: SidebarNavArgs) =>
            PROTECTED_URLS.BILLING(args.teamIdOrSlug!),
          icon: CreditCard,
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
    icon: UserRoundCog,
  },
]

export const SIDEBAR_ALL_LINKS = [...SIDEBAR_MAIN_LINKS, ...SIDEBAR_EXTRA_LINKS]
