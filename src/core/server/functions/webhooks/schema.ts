import { z } from 'zod'
import { SandboxLifecycleEventTypeSchema } from '@/core/modules/sandboxes/lifecycle-event-types'

const WebhookUrlSchema = z.httpUrl('Must be a valid URL').trim()
const WebhookSecretSchema = z
  .string()
  .trim()
  .min(32, 'Secret must be at least 32 characters')

export const UpsertWebhookInputSchema = z
  .object({
    mode: z.enum(['create', 'update']),
    webhookId: z.uuid().optional(),
    name: z.string().min(1, 'Name is required').trim(),
    url: WebhookUrlSchema,
    events: z
      .array(SandboxLifecycleEventTypeSchema)
      .min(1, 'At least one event is required'),
    signatureSecret: WebhookSecretSchema.optional(),
    enabled: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'create' && !data.signatureSecret) {
      ctx.addIssue({
        code: 'custom',
        message: 'Secret is required when creating a webhook',
        path: ['signatureSecret'],
      })
    }
    if (data.mode === 'update' && !data.webhookId) {
      ctx.addIssue({
        code: 'custom',
        message: 'webhookId is required when updating a webhook',
        path: ['webhookId'],
      })
    }
  })

export const DeleteWebhookInputSchema = z.object({
  webhookId: z.uuid(),
})

export const UpdateWebhookSecretInputSchema = z.object({
  webhookId: z.uuid(),
  signatureSecret: WebhookSecretSchema,
})

const DeliveryStatusSchema = z.enum(['success', 'failed'])
const WebhookStatsBucketIntervalSecondsSchema = z.literal([
  60, 300, 600, 1800, 3600, 14400, 86400,
] as const)

export const GetWebhookInputSchema = z.object({
  webhookId: z.uuid(),
})

export const ListWebhookDeliveriesInputSchema = z.object({
  webhookId: z.uuid(),
  limit: z.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().optional(),
  orderAsc: z.boolean().optional().default(false),
  start: z.iso.datetime().optional(),
  end: z.iso.datetime().optional(),
  deliveryStatus: z.array(DeliveryStatusSchema).optional(),
  eventType: z.array(SandboxLifecycleEventTypeSchema).optional(),
})

export const GetWebhookDeliveryStatsInputSchema = z
  .object({
    webhookId: z.uuid(),
    start: z.iso.datetime().optional(),
    end: z.iso.datetime().optional(),
    bucketIntervalSeconds: WebhookStatsBucketIntervalSecondsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.start || !data.end) return

    const start = new Date(data.start)
    const end = new Date(data.end)
    if (end.getTime() - start.getTime() <= 7 * 24 * 60 * 60 * 1000) return

    ctx.addIssue({
      code: 'custom',
      message: 'Webhook delivery stats range must be 7 days or less',
      path: ['start'],
    })
  })

export type UpsertWebhookFormInput = z.input<typeof UpsertWebhookInputSchema>
export type UpsertWebhookInput = z.output<typeof UpsertWebhookInputSchema>
export type DeleteWebhookInput = z.input<typeof DeleteWebhookInputSchema>
export type UpdateWebhookSecretInput = z.input<
  typeof UpdateWebhookSecretInputSchema
>
export type GetWebhookInput = z.input<typeof GetWebhookInputSchema>
export type ListWebhookDeliveriesInput = z.input<
  typeof ListWebhookDeliveriesInputSchema
>
export type GetWebhookDeliveryStatsInput = z.input<
  typeof GetWebhookDeliveryStatsInputSchema
>
export type WebhookStatsBucketIntervalSeconds = z.infer<
  typeof WebhookStatsBucketIntervalSecondsSchema
>
