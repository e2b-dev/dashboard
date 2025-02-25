'use server'

import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { User } from '@supabase/supabase-js'
import {
  checkAuthenticated,
  getUserAccessToken,
  guard,
} from '@/lib/utils/server'
import { z } from 'zod'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { E2BError } from '@/types/errors'

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).optional(),
})

export type UpdateUserSchemaType = z.infer<typeof UpdateUserSchema>

interface UpdateUserResponse {
  newUser: User
}

export const updateUserAction = guard<
  typeof UpdateUserSchema,
  UpdateUserResponse
>(UpdateUserSchema, async (data) => {
  const { supabase } = await checkAuthenticated()

  const origin = (await headers()).get('origin')

  const { data: updateData, error } = await supabase.auth.updateUser(
    {
      email: data.email,
      password: data.password,
      data: {
        name: data.name,
      },
    },
    {
      emailRedirectTo: `${origin}/api/auth/email-callback?new_email=${data.email}`,
    }
  )

  if (error) {
    throw new E2BError('update_user_error', error.message)
  }

  revalidatePath('/dashboard', 'layout')

  return {
    newUser: updateData.user,
  }
})

export const deleteAccountAction = guard(async () => {
  const { user } = await checkAuthenticated()

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)

  if (error) {
    throw error
  }
})

export const getUserAccessTokenAction = guard(async () => {
  const { user } = await checkAuthenticated()

  const accessToken = await getUserAccessToken(user.id)

  return {
    accessToken,
  }
})
