import z from 'zod'
import { httpUrlSchema } from '@/lib/schemas/url'

export const OtpTypeSchema = z.enum([
  'signup',
  'recovery',
  'invite',
  'magiclink',
  'email',
  'email_change',
])

export type OtpType = z.infer<typeof OtpTypeSchema>

export const ConfirmEmailInputSchema = z.object({
  token_hash: z.string().min(1),
  type: OtpTypeSchema,
  next: httpUrlSchema,
})

export type ConfirmEmailInput = z.infer<typeof ConfirmEmailInputSchema>

export interface ConfirmEmailResult {
  redirectUrl: string
}
