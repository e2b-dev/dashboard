import z from 'zod'
import { httpUrlSchema } from '@/core/shared/schemas/url'

export type AuthUser = {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  providers: string[]
  canChangeEmail: boolean
  canChangePassword: boolean
}

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
