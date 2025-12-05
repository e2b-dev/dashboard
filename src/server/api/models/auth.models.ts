import z from 'zod'

// otp types supported by supabase
export const OtpTypeSchema = z.enum([
  'signup',
  'recovery',
  'invite',
  'magiclink',
  'email',
  'email_change',
])

export type OtpType = z.infer<typeof OtpTypeSchema>

// shared schema for client form and tRPC router
export const ConfirmEmailInputSchema = z.object({
  token_hash: z.string().min(1),
  type: OtpTypeSchema,
  next: z.httpUrl(),
})

export type ConfirmEmailInput = z.infer<typeof ConfirmEmailInputSchema>

// response types
export interface ConfirmEmailResult {
  redirectUrl: string
}
