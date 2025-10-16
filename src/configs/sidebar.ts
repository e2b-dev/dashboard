import {
  Activity,
  Box,
  Container,
  CreditCard,
  DollarSign,
  Key,
  LucideProps,
  UserRoundCog,
  Users,
} from 'lucide-react'
import { ForwardRefExoticComponent, RefAttributes } from 'react'
import { INCLUDE_BILLING } from './flags'
import { PROTECTED_URLS } from './urls'

type SidebarNavArgs = {
  teamIdOrSlug?: string
}

export type SidebarNavItem = {
  label: string
  href: (args: SidebarNavArgs) => string
  icon: ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
  >
  group?: string
  activeMatch?: string
}

export const SIDEBAR_MAIN_LINKS: SidebarNavItem[] = [
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
  ...(INCLUDE_BILLING
    ? [
        {
          label: 'Usage',
          href: (args: SidebarNavArgs) =>
            PROTECTED_URLS.USAGE(args.teamIdOrSlug!),
          icon: Activity,
          activeMatch: `/dashboard/*/usage/**`,
        },
      ]
    : []),
  {
    label: 'Members',
    href: (args) => PROTECTED_URLS.MEMBERS(args.teamIdOrSlug!),
    icon: Users,
    group: 'team',
    activeMatch: `/dashboard/*/members/**`,
  },
  {
    label: 'Settings',
    href: (args) => PROTECTED_URLS.SETTINGS(args.teamIdOrSlug!, 'general'),
    icon: Key,
    group: 'team',
    activeMatch: `/dashboard/*/settings/**`,
  },
  ...(INCLUDE_BILLING
    ? [
        {
          label: 'Billing',
          href: (args: SidebarNavArgs) =>
            PROTECTED_URLS.BILLING(args.teamIdOrSlug!),
          icon: CreditCard,
          group: 'expenses',
          activeMatch: `/dashboard/*/billing/**`,
        },
        {
          label: 'Budget',
          href: (args: SidebarNavArgs) =>
            PROTECTED_URLS.BUDGET(args.teamIdOrSlug!),
          group: 'expenses',
          icon: DollarSign,
          activeMatch: `/dashboard/*/budget/**`,
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
