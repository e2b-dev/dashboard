import { z } from 'zod'

const WebhookUrlSchema = z.httpUrl('Must be a valid URL').trim()
const WebhookSecretSchema = z
  .string()
  .trim()
  .min(32, 'Secret must be at least 32 characters')

export const UpsertWebhookInputSchema = z
  .object({
    mode: z.enum(['add', 'edit']),
    webhookId: z.uuid().optional(),
    name: z.string().min(1, 'Name is required').trim(),
    url: WebhookUrlSchema,
    events: z.array(z.string().min(1, 'At least one event is required')),
    signatureSecret: WebhookSecretSchema.optional(),
    enabled: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      if (data.mode === 'add') {
        return !!data.signatureSecret
      }
      return true
    },
    {
      message: 'Secret is required when creating a webhook',
      path: ['signatureSecret'],
    }
  )

export const DeleteWebhookInputSchema = z.object({
  webhookId: z.uuid(),
})

export const UpdateWebhookSecretInputSchema = z.object({
  webhookId: z.uuid(),
  signatureSecret: WebhookSecretSchema,
})

export type UpsertWebhookInput = z.input<typeof UpsertWebhookInputSchema>
export type DeleteWebhookInput = z.input<typeof DeleteWebhookInputSchema>
export type UpdateWebhookSecretInput = z.input<
  typeof UpdateWebhookSecretInputSchema
>
