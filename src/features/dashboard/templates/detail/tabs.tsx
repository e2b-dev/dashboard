'use client'

import { usePathname } from 'next/navigation'
import posthog from 'posthog-js'
import { useEffect, useRef } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { DashboardTabsList } from '@/ui/dashboard-tabs'
import { BuildIcon, DashboardIcon, TagIcon } from '@/ui/primitives/icons'

interface TemplateDetailTabsProps {
  teamSlug: string
  templateId: string
}

type DetailTabId = 'overview' | 'builds' | 'tags'

const TAB_PATHS: Record<DetailTabId, (pathname: string) => boolean> = {
  overview: (p) => p.endsWith('/overview'),
  builds: (p) => p.endsWith('/builds'),
  tags: (p) => p.endsWith('/tags'),
}

function tabFromPath(pathname: string): DetailTabId {
  if (TAB_PATHS.builds(pathname)) return 'builds'
  if (TAB_PATHS.tags(pathname)) return 'tags'
  return 'overview'
}

export default function TemplateDetailTabs({
  teamSlug,
  templateId,
}: TemplateDetailTabsProps) {
  const pathname = usePathname()
  const activeTab = tabFromPath(pathname)
  const prevTabRef = useRef<DetailTabId | null>(null)

  useEffect(() => {
    if (prevTabRef.current === null) {
      // First render \u2014 emit `template detail opened` once per mount.
      posthog.capture('template detail opened', {
        templateId,
        tab: activeTab,
      })
    } else if (prevTabRef.current !== activeTab) {
      posthog.capture('template detail tab switched', {
        templateId,
        fromTab: prevTabRef.current,
        toTab: activeTab,
      })
    }
    prevTabRef.current = activeTab
  }, [activeTab, templateId])

  return (
    <DashboardTabsList
      layoutKey="tabs-indicator-template-detail"
      tabs={[
        {
          id: 'overview',
          label: 'Overview',
          href: PROTECTED_URLS.TEMPLATE_OVERVIEW(teamSlug, templateId),
          icon: <DashboardIcon className="size-4" />,
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
