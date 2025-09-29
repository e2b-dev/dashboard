'use server'

import { authActionClient } from '@/lib/clients/action'
import { generateE2BUserAccessToken } from '@/lib/utils/server'
import { returnValidationErrors } from 'next-safe-action'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'

const UpdateUserSchema = z
  .object({
    email: z.email().optional(),
    password: z.string().min(8).optional(),
    name: z.string().min(1).optional(),
  })
  .refine(
    (data) => {
      return Boolean(data.email || data.password || data.name)
    },
    {
      message: 'At least one field must be provided (email, password, name)',
      path: [],
    }
  )

export type UpdateUserSchemaType = z.infer<typeof UpdateUserSchema>

export const updateUserAction = authActionClient
  .schema(UpdateUserSchema)
  .metadata({ actionName: 'updateUser' })
  .action(async ({ parsedInput, ctx }) => {
    const { supabase, user } = ctx

    // basic security check, that password does not equal e-mail
    if (parsedInput.password) {
      const passwordAsUserEmail =
        parsedInput.password.toLowerCase() === user?.email?.toLowerCase()
      const passwordAsEmail =
        parsedInput.password.toLowerCase() === parsedInput.email?.toLowerCase()

      if (passwordAsUserEmail || passwordAsEmail) {
        return returnValidationErrors(UpdateUserSchema, {
          password: {
            _errors: ['Password is too weak.'],
          },
        })
      }
    }

    const origin = (await headers()).get('origin')

    const { data: updateData, error } = await supabase.auth.updateUser(
      {
        email: parsedInput.email,
        password: parsedInput.password,
        data: {
          name: parsedInput.name,
        },
      },
      {
        emailRedirectTo: `${origin}/api/auth/email-callback?new_email=${parsedInput.email}`,
      }
    )

    if (!error) {
      // ensure other sessions are logged out if password was changed
      if (parsedInput.password) {
        await supabase.auth.signOut({ scope: 'others' })
      }

      revalidatePath('/dashboard', 'layout')

      return {
        user: updateData.user,
      }
    }

    switch (error?.code) {
      case 'email_address_invalid':
        return returnValidationErrors(UpdateUserSchema, {
          email: {
            _errors: ['Invalid e-mail address.'],
          },
        })
      case 'email_exists':
        return returnValidationErrors(UpdateUserSchema, {
          email: {
            _errors: ['E-mail already in use.'],
          },
        })
      case 'same_password':
        return returnValidationErrors(UpdateUserSchema, {
          password: {
            _errors: ['New password cannot be the same as the old password.'],
          },
        })
      case 'weak_password':
        return returnValidationErrors(UpdateUserSchema, {
          password: {
            _errors: ['Password is too weak.'],
          },
        })
      case 'reauthentication_needed':
        return {
          requiresReauth: true,
        }
      default:
        throw error
    }
  })

export const getUserAccessTokenAction = authActionClient
  .metadata({ actionName: 'getUserAccessToken' })
  .action(async ({ ctx }) => {
    const { session } = ctx

    const token = await generateE2BUserAccessToken(session.access_token)

    return token
  })
