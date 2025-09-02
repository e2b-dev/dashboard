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

type DashboardNavLinkArgs = {
  teamIdOrSlug?: string
}

export type DashboardNavLink = {
  label: string
  href: (args: DashboardNavLinkArgs) => string
  icon: ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
  >
  group?: string
  activeMatch?: string
}

export const MAIN_DASHBOARD_LINKS: DashboardNavLink[] = [
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
          href: (args: DashboardNavLinkArgs) =>
            PROTECTED_URLS.USAGE(args.teamIdOrSlug!),
          icon: Activity,
          activeMatch: `/dashboard/*/usage/**`,
        },
      ]
    : []),
  {
    label: 'Team',
    href: (args) => PROTECTED_URLS.TEAM(args.teamIdOrSlug!),
    icon: Users,
    group: 'manage',
    activeMatch: `/dashboard/*/team/**`,
  },
  {
    label: 'API Keys',
    href: (args) => PROTECTED_URLS.KEYS(args.teamIdOrSlug!),
    icon: Key,
    group: 'manage',
    activeMatch: `/dashboard/*/keys/**`,
  },

  ...(INCLUDE_BILLING
    ? [
        {
          label: 'Billing',
          href: (args: DashboardNavLinkArgs) =>
            PROTECTED_URLS.BILLING(args.teamIdOrSlug!),
          icon: CreditCard,
          group: 'expenses',
          activeMatch: `/dashboard/*/billing/**`,
        },
        {
          label: 'Budget',
          href: (args: DashboardNavLinkArgs) =>
            PROTECTED_URLS.BUDGET(args.teamIdOrSlug!),
          group: 'expenses',
          icon: DollarSign,
          activeMatch: `/dashboard/*/budget/**`,
        },
      ]
    : []),
]

export const EXTRA_DASHBOARD_LINKS: DashboardNavLink[] = [
  {
    label: 'Account Settings',
    href: (args) => PROTECTED_URLS.ACCOUNT_SETTINGS,
    icon: UserRoundCog,
  },
]

export const ALL_DASHBOARD_LINKS = [
  ...MAIN_DASHBOARD_LINKS,
  ...EXTRA_DASHBOARD_LINKS,
]
