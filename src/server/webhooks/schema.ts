import { z } from 'zod'
import { zfd } from 'zod-form-data'

const WebhookUrlSchema = z
  .string({ required_error: 'URL is required' })
  .url('Must be a valid URL')
  .trim()

export const UpsertWebhookSchema = zfd.formData({
  teamId: zfd.text(z.string().uuid()),
  mode: zfd.text(z.enum(['add', 'edit'])),
  webhookId: zfd.text(z.string().uuid().optional()),
  name: zfd.text(z.string().min(1, 'Name is required').trim()),
  url: zfd.text(WebhookUrlSchema),
  events: zfd.repeatable(z.array(zfd.text()).min(1)),
  signatureSecret: zfd.text(
    z.string().min(32, 'Secret must be at least 32 characters')
  ),
  enabled: zfd.text(z.coerce.boolean().optional().default(true)),
})

export const DeleteWebhookSchema = zfd.formData({
  teamId: zfd.text(z.string().uuid()),
  webhookId: zfd.text(z.string().uuid()),
})

export type UpsertWebhookSchemaType = z.infer<typeof UpsertWebhookSchema>
export type DeleteWebhookSchemaType = z.infer<typeof DeleteWebhookSchema>
