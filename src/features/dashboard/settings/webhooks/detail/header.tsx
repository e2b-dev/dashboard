'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { PROTECTED_URLS } from '@/configs/urls'
import { SandboxLifecycleEventTypeSchema } from '@/core/modules/sandboxes/lifecycle-event-types'
import { WEBHOOK_EVENT_LABELS } from '@/features/dashboard/settings/webhooks/constants'
import { useTRPC } from '@/trpc/client'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { ArrowLeftIcon, WebhookIcon } from '@/ui/primitives/icons'
import { WebhookStatusBadge } from './status-badge'

type WebhookDetailHeaderProps = {
  teamSlug: string
  webhookId: string
}

const formatDate = (value?: string) => {
  if (!value) return 'Unknown'

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getEventLabel = (event: string) => {
  const parsed = SandboxLifecycleEventTypeSchema.safeParse(event)
  if (parsed.success) return WEBHOOK_EVENT_LABELS[parsed.data]

  return event
}

export const WebhookDetailHeader = ({
  teamSlug,
  webhookId,
}: WebhookDetailHeaderProps) => {
  const trpc = useTRPC()
  const { data } = useSuspenseQuery(
    trpc.webhooks.get.queryOptions({ teamSlug, webhookId })
  )
  const { webhook } = data

  return (
    <header className="border-stroke bg-bg flex flex-col gap-4 border-b px-3 py-4 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <Button variant="quaternary" size="none" asChild>
            <Link
              className="w-fit gap-1 text-fg-tertiary"
              href={PROTECTED_URLS.WEBHOOKS(teamSlug)}
            >
              <ArrowLeftIcon className="size-3.5" />
              Back to webhooks
            </Link>
          </Button>

          <div className="flex min-w-0 items-center gap-3">
            <div
              aria-hidden="true"
              className="border-stroke flex size-9 shrink-0 items-center justify-center border"
            >
              <WebhookIcon className="size-4 text-fg-secondary" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-fg prose-headline-small">
                  {webhook.name}
                </h1>
                <WebhookStatusBadge enabled={webhook.enabled} />
              </div>
              <p className="truncate font-mono uppercase text-fg-tertiary prose-label-numeric">
                {webhook.url}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-1 text-left md:text-right">
          <p className="font-mono uppercase text-fg-tertiary prose-label">
            Webhook ID
          </p>
          <p className="font-mono text-fg-secondary prose-label-numeric">
            {webhook.id}
          </p>
          <p className="pt-1 text-fg-tertiary prose-body">
            Created {formatDate(webhook.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {webhook.events.map((event) => (
          <Badge key={event}>{getEventLabel(event)}</Badge>
        ))}
      </div>
    </header>
  )
}
