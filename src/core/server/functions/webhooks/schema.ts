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

const DeliveryStatusFilterSchema = z.enum(['all', 'success', 'failed'])

export const GetWebhookInputSchema = z.object({
  webhookId: z.uuid(),
})

export const ListWebhookDeliveriesInputSchema = z.object({
  webhookId: z.uuid(),
  limit: z.number().int().min(1).max(100).optional().default(25),
  offset: z.number().int().min(0).optional().default(0),
  orderAsc: z.boolean().optional().default(false),
  deliveryStatus: DeliveryStatusFilterSchema.optional().default('all'),
  eventType: z.string().trim().min(1).optional(),
})

export const GetWebhookDeliveryInputSchema = z.object({
  webhookId: z.uuid(),
  deliveryId: z.uuid(),
})

export const GetWebhookDeliveryStatsInputSchema = z.object({
  webhookId: z.uuid(),
  start: z.iso.datetime().optional(),
  end: z.iso.datetime().optional(),
})

export type UpsertWebhookInput = z.input<typeof UpsertWebhookInputSchema>
export type DeleteWebhookInput = z.input<typeof DeleteWebhookInputSchema>
export type UpdateWebhookSecretInput = z.input<
  typeof UpdateWebhookSecretInputSchema
>
export type GetWebhookInput = z.input<typeof GetWebhookInputSchema>
export type ListWebhookDeliveriesInput = z.input<
  typeof ListWebhookDeliveriesInputSchema
>
export type GetWebhookDeliveryInput = z.input<
  typeof GetWebhookDeliveryInputSchema
>
export type GetWebhookDeliveryStatsInput = z.input<
  typeof GetWebhookDeliveryStatsInputSchema
>
