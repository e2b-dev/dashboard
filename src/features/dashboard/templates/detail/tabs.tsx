'use client'

import { usePathname } from 'next/navigation'
import { PROTECTED_URLS } from '@/configs/urls'
import { DashboardTabsList } from '@/ui/dashboard-tabs'
import { BuildIcon, TagIcon, TrendIcon } from '@/ui/primitives/icons'

interface TemplateDetailTabsProps {
  teamSlug: string
  templateId: string
}

type DetailTabId = 'overview' | 'builds' | 'tags'

function tabFromPath(pathname: string, templateId: string): DetailTabId {
  const marker = `/templates/${templateId}/`
  const idx = pathname.indexOf(marker)
  if (idx === -1) return 'overview'
  const segment = pathname.slice(idx + marker.length).split('/')[0]
  if (segment === 'builds') return 'builds'
  if (segment === 'tags') return 'tags'
  return 'overview'
}

export default function TemplateDetailTabs({
  teamSlug,
  templateId,
}: TemplateDetailTabsProps) {
  const pathname = usePathname()
  const activeTab = tabFromPath(pathname, templateId)

  return (
    <DashboardTabsList
      layoutKey="tabs-indicator-template-detail"
      tabs={[
        {
          id: 'overview',
          label: 'Overview',
          href: PROTECTED_URLS.TEMPLATE_OVERVIEW(teamSlug, templateId),
          icon: <TrendIcon className="size-4" />,
        },
        {
          id: 'builds',
          label: 'Builds',
          href: PROTECTED_URLS.TEMPLATE_DETAIL_BUILDS(teamSlug, templateId),
          icon: <BuildIcon className="size-4" />,
        },
        {
          id: 'tags',
          label: 'Tags',
          href: PROTECTED_URLS.TEMPLATE_TAGS(teamSlug, templateId),
          icon: <TagIcon className="size-4" />,
        },
      ]}
    />
  )
}
