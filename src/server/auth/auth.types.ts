import { CAPTCHA_REQUIRED_CLIENT } from '@/configs/flags'
import { relativeUrlSchema } from '@/lib/schemas/url'
import { z } from 'zod'

export const emailSchema = z.email('Valid email is required')

export const captchaTokenSchema = z
  .string()
  .optional()
  .refine((value) => {
    if (!CAPTCHA_REQUIRED_CLIENT) return true

    return value !== undefined
  })

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    returnTo: relativeUrlSchema.optional(),
    captchaToken: captchaTokenSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  returnTo: relativeUrlSchema.optional(),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  callbackUrl: z.string().optional(),
})
