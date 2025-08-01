import { z } from 'zod'

export const signUpSchema = z
  .object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    returnTo: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export const signInSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  returnTo: z.string().optional(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
  callbackUrl: z.string().optional(),
})
