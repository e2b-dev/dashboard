'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { TRPCClientError } from '@trpc/client'
import { notFound } from 'next/navigation'
import { useMemo } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useTRPC } from '@/trpc/client'

interface TemplateTitleBinderProps {
  teamSlug: string
  templateId: string
}

// Drives the dashboard title for all detail tabs from a single fetch; also the 404 entry point.
export default function TemplateTitleBinder({
  teamSlug,
  templateId,
}: TemplateTitleBinderProps) {
  const trpc = useTRPC()

  const { data, error } = useSuspenseQuery(
    trpc.templates.getTemplate.queryOptions(
      { teamSlug, templateId },
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: (failureCount, err) => {
          if (
            err instanceof TRPCClientError &&
            err.data?.code === 'NOT_FOUND'
          ) {
            return false
          }
          return failureCount < 3
        },
      }
    )
  )

  if (error instanceof TRPCClientError && error.data?.code === 'NOT_FOUND') {
    notFound()
  }

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
    template.templateID
  )

  return null
}
