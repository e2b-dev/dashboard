import { z } from 'zod'

const WebhookUrlSchema = z.url('Must be a valid URL').trim()

export const UpsertWebhookSchema = z
  .object({
    teamId: z.uuid(),
    mode: z.enum(['add', 'edit']),
    webhookId: z.uuid().optional(),
    name: z.string().min(1, 'Name is required').trim(),
    url: WebhookUrlSchema,
    events: z.array(z.string().min(1, 'At least one event is required')),
    signatureSecret: z
      .string()
      .min(32, 'Secret must be at least 32 characters')
      .trim()
      .optional(),
    enabled: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      // require signatureSecret only when mode is 'add'
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

export const DeleteWebhookSchema = z.object({
  teamId: z.uuid(),
  webhookId: z.uuid(),
})

export type UpsertWebhookSchemaType = z.input<typeof UpsertWebhookSchema>
export type DeleteWebhookSchemaType = z.input<typeof DeleteWebhookSchema>
