import { type Icon, SandboxIcon, TemplateIcon } from '@/ui/primitives/icons'
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
}

export const SIDEBAR_MAIN_LINKS: SidebarNavItem[] = [
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
]

export const SIDEBAR_ALL_LINKS = [...SIDEBAR_MAIN_LINKS]
