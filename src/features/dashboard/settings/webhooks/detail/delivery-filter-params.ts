import { createParser, parseAsArrayOf } from 'nuqs/server'

const WEBHOOK_DELIVERY_STATUSES = ['success', 'failed'] as const

type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[number]

// Maps URL value to delivery status, e.g. "failed" -> "failed".
const deliveryStatusParser = createParser({
  parse: (value) => {
    const matchedStatus = WEBHOOK_DELIVERY_STATUSES.find(
      (status) => status === value
    )

    return matchedStatus ?? null
  },
  serialize: (value: WebhookDeliveryStatus) => value,
})

const deliveryFilterParams = {
  statuses: parseAsArrayOf(deliveryStatusParser),
}

export {
  deliveryFilterParams,
  WEBHOOK_DELIVERY_STATUSES,
  type WebhookDeliveryStatus,
}
