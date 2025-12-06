import z from 'zod'

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
  next: z.httpUrl(),
})

export type ConfirmEmailInput = z.infer<typeof ConfirmEmailInputSchema>

export interface ConfirmEmailResult {
  redirectUrl: string
}
