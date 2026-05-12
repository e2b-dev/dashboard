import { Badge } from '@/ui/primitives/badge'

type WebhookDeliveryHealth = 'disabled' | 'failing' | 'healthy' | 'unknown'

const statusConfigMap: Record<
  WebhookDeliveryHealth,
  { label: string; variant: React.ComponentProps<typeof Badge>['variant'] }
> = {
  disabled: { label: 'Disabled', variant: 'warning' },
  failing: { label: 'Failing', variant: 'error' },
  healthy: { label: 'Healthy', variant: 'positive' },
  unknown: { label: 'No deliveries', variant: 'info' },
}

type WebhookStatusBadgeProps = {
  enabled: boolean
  failedCount?: number
  totalCount?: number
}

export const WebhookStatusBadge = ({
  enabled,
  failedCount,
  totalCount,
}: WebhookStatusBadgeProps) => {
  const health: WebhookDeliveryHealth = !enabled
    ? 'disabled'
    : !totalCount
      ? 'unknown'
      : failedCount && failedCount > 0
        ? 'failing'
        : 'healthy'
  const config = statusConfigMap[health]

  return <Badge variant={config.variant}>{config.label}</Badge>
}
