'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { WebhookEventBadges } from '@/features/dashboard/settings/webhooks/event-badges'
import { useClipboard } from '@/lib/hooks/use-clipboard'
import { defaultSuccessToast, toast } from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { CheckIcon, CopyIcon } from '@/ui/primitives/icons'
import { DetailsItem, DetailsRow } from '../../../layouts/details-row'

type WebhookDetailHeaderProps = {
  teamSlug: string
  webhookId: string
}

const formatDate = (value?: string) => {
  if (!value) return '-'

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getWebhookIdBadgeLabel = (id: string) =>
  `${id.slice(0, 6)}...${id.slice(-6)}`

const WebhookIdBadge = ({ id }: { id: string }) => {
  const [wasCopied, copy] = useClipboard(1500)

  const handleCopy = async () => {
    await copy(id)
    toast(defaultSuccessToast('Webhook ID copied'))
  }

  return (
    <Badge className="bg-bg-highlight text-fg-tertiary h-[18px] gap-[3px] px-1 prose-label-numeric">
      <span className="tracking-wider">{getWebhookIdBadgeLabel(id)}</span>
      <Button
        type="button"
        variant="quaternary"
        size="none"
        className="text-fg-tertiary hover:text-fg h-3 w-3 shrink-0 active:translate-y-0"
        aria-label="Copy full webhook ID"
        onClick={handleCopy}
      >
        {wasCopied ? (
          <CheckIcon className="size-3" />
        ) : (
          <CopyIcon className="size-3" />
        )}
      </Button>
    </Badge>
  )
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
    <header className="bg-bg relative z-30 w-full p-3 md:p-6">
      <DetailsRow>
        <DetailsItem label="ID">
          <WebhookIdBadge id={webhook.id} />
        </DetailsItem>
        <DetailsItem label="Created">
          <p>{formatDate(webhook.createdAt)}</p>
        </DetailsItem>
        <DetailsItem label="Events">
          <div className="flex flex-wrap items-center gap-1">
            <WebhookEventBadges events={webhook.events} />
          </div>
        </DetailsItem>
      </DetailsRow>
    </header>
  )
}
