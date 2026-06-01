'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useTRPC } from '@/trpc/client'

interface TemplateTitleBinderProps {
  teamSlug: string
  templateId: string
}

export default function TemplateTitleBinder({
  teamSlug,
  templateId,
}: TemplateTitleBinderProps) {
  const trpc = useTRPC()

  const { data } = useSuspenseQuery(
    trpc.templates.getTemplate.queryOptions({ teamSlug, templateId })
  )

  const template = data.template

  const displayName = useMemo(() => {
    const noSlash = template.names.find((n) => !n.includes('/'))
    return noSlash ?? template.names[0] ?? template.templateID
  }, [template.names, template.templateID])

  usePageTitle(
    [
      {
        label: 'Templates',
        href: PROTECTED_URLS.TEMPLATES_LIST(teamSlug),
      },
      { label: displayName },
    ],
    displayName
  )

  return null
}
