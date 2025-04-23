'use server'

import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { checkUserTeamAuthorization } from '@/lib/utils/server'
import { z } from 'zod'
import { kv } from '@vercel/kv'
import { KV_KEYS } from '@/configs/keys'
import { revalidatePath } from 'next/cache'
import { uploadFile, deleteFile, getFiles } from '@/lib/clients/storage'
import { authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'
import { zfd } from 'zod-form-data'
import { logWarning } from '@/lib/clients/logger'
import { returnValidationErrors } from 'next-safe-action'
import { getTeam } from './get-team'
import { BASE_TIER_ID, FREE_CREDITS_NEW_TEAM_USD } from '@/configs/tiers'
import { CreateTeamSchema, UpdateTeamNameSchema } from './types'
import { generateTeamApiKey } from '@/server/keys/key-actions'
import sql from '@/lib/clients/pg'
import { Database } from '@/types/database.types'

export const updateTeamNameAction = authActionClient
  .schema(UpdateTeamNameSchema)
  .metadata({ actionName: 'updateTeamName' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, name } = parsedInput
    const { user } = ctx

    const isAuthorized = await checkUserTeamAuthorization(user.id, teamId)

    if (!isAuthorized) {
      return returnServerError('User is not authorized to update this team')
    }

    const { data, error } = await supabaseAdmin
      .from('teams')
      .update({ name })
      .eq('id', teamId)
      .select()
      .single()

    if (error) {
      return returnServerError(`Failed to update team name: ${error.message}`)
    }

    revalidatePath('/dashboard', 'layout')

    return data
  })

const AddTeamMemberSchema = z.object({
  teamId: z.string().uuid(),
  email: z.string().email(),
})

export const addTeamMemberAction = authActionClient
  .schema(AddTeamMemberSchema)
  .metadata({ actionName: 'addTeamMember' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, email } = parsedInput
    const { user } = ctx

    const isAuthorized = await checkUserTeamAuthorization(user.id, teamId)

    if (!isAuthorized) {
      return returnServerError('User is not authorized to add a team member')
    }

    const { data: existingUsers, error: userError } = await supabaseAdmin
      .from('auth_users')
      .select('*')
      .eq('email', email)

    if (userError) {
      return returnServerError(`Error finding user: ${userError.message}`)
    }

    const existingUser = existingUsers?.[0]

    if (!existingUser) {
      return returnServerError(
        'User with this email does not exist. Account must be registered first.'
      )
    }

    const { data: existingTeamMember } = await supabaseAdmin
      .from('users_teams')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', existingUser.id!)
      .single()

    if (existingTeamMember) {
      return returnServerError('User is already a member of this team')
    }

    const { error: insertError } = await supabaseAdmin
      .from('users_teams')
      .insert({
        team_id: teamId,
        user_id: existingUser.id!,
        added_by: user.id,
      })

    if (insertError) {
      return returnServerError(
        `Failed to add team member: ${insertError.message}`
      )
    }

    revalidatePath(`/dashboard/[teamIdOrSlug]/general`, 'page')
    revalidatePath(`/dashboard`, 'layout')

    await kv.del(KV_KEYS.USER_TEAM_ACCESS(user.id, teamId))
    getTeam({ teamId }).then(async (result) => {
      if (!result?.data || result.serverError || result.validationErrors) {
        return
      }

      await kv.del(KV_KEYS.USER_TEAM_ACCESS(user.id, result.data.slug))
    })
  })

const RemoveTeamMemberSchema = z.object({
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
})

export const removeTeamMemberAction = authActionClient
  .schema(RemoveTeamMemberSchema)
  .metadata({ actionName: 'removeTeamMember' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, userId } = parsedInput
    const { user } = ctx

    const isAuthorized = await checkUserTeamAuthorization(user.id, teamId)

    if (!isAuthorized) {
      return returnServerError('User is not authorized to remove team members')
    }

    const { data: teamMemberData, error: teamMemberError } = await supabaseAdmin
      .from('users_teams')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (teamMemberError || !teamMemberData || teamMemberData.length === 0) {
      return returnServerError('User is not a member of this team')
    }

    const teamMember = teamMemberData[0]

    if (teamMember.user_id !== user.id && teamMember.is_default) {
      return returnServerError('Cannot remove a default team member')
    }

    const { count, error: countError } = await supabaseAdmin
      .from('users_teams')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)

    if (countError) {
      return returnServerError(
        `Error checking team members: ${countError.message}`
      )
    }

    if (count === 1) {
      return returnServerError('Cannot remove the last team member')
    }

    const { error: removeError } = await supabaseAdmin
      .from('users_teams')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (removeError) {
      throw removeError
    }

    revalidatePath(`/dashboard/[teamIdOrSlug]/general`, 'page')
    revalidatePath(`/dashboard`, 'layout')

    await kv.del(KV_KEYS.USER_TEAM_ACCESS(user.id, teamId))
    getTeam({ teamId }).then(async (result) => {
      if (!result?.data || result.serverError || result.validationErrors) {
        return
      }

      await kv.del(KV_KEYS.USER_TEAM_ACCESS(user.id, result.data.slug))
    })
  })

export const createTeamAction = authActionClient
  .schema(CreateTeamSchema)
  .metadata({ actionName: 'createTeam' })
  .action(async ({ parsedInput, ctx }) => {
    const { name } = parsedInput
    const { user } = ctx

    if (!user.email) {
      return returnServerError('User email is required to create a team')
    }

    const userEmail = user.email as string

    // If this throws, it will be caught & logged by the action error boundary
    type TeamReturn = Pick<
      Database['public']['Tables']['teams']['Row'],
      'id' | 'slug'
    >

    const createdTeam = await sql.begin<TeamReturn>(async (sql) => {
      const [team] = await sql<TeamReturn[]>`
          INSERT INTO teams (name, email, tier)
          VALUES (${name}, ${userEmail}, ${BASE_TIER_ID})
          RETURNING id, slug
        `

      await sql`
          INSERT INTO users_teams (team_id, user_id)
          VALUES (${team.id}, ${user.id})
        `

      // TODO: replace with infra api call for key hashing
      const apiKeyValue = await generateTeamApiKey()
      await sql`
          INSERT INTO team_api_keys (team_id, name, api_key, created_by)
          VALUES (${team.id}, 'Default API Key', ${apiKeyValue}, ${user.id})
        `

      await sql`
          INSERT INTO billing.credits (team_id, credits_usd)
          VALUES (${team.id}, ${FREE_CREDITS_NEW_TEAM_USD})
        `

      return team
    })

    revalidatePath('/dashboard', 'layout')

    return {
      slug: createdTeam.slug,
    }
  })

const UploadTeamProfilePictureSchema = zfd.formData(
  z.object({
    teamId: zfd.text(),
    image: zfd.file(),
  })
)

export const uploadTeamProfilePictureAction = authActionClient
  .schema(UploadTeamProfilePictureSchema)
  .metadata({ actionName: 'uploadTeamProfilePicture' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, image } = parsedInput

    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml']

    if (!allowedTypes.includes(image.type)) {
      return returnValidationErrors(UploadTeamProfilePictureSchema, {
        image: { _errors: ['File must be JPG, PNG, or SVG format'] },
      })
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

    if (image.size > MAX_FILE_SIZE) {
      return returnValidationErrors(UploadTeamProfilePictureSchema, {
        image: { _errors: ['File size must be less than 5MB'] },
      })
    }

    const { user } = ctx

    const isAuthorized = await checkUserTeamAuthorization(user.id, teamId)

    if (!isAuthorized) {
      return returnServerError('User is not authorized to update this team')
    }

    const extension = image.name.split('.').pop() || 'png'
    const fileName = `${Date.now()}.${extension}`
    const filePath = `teams/${teamId}/${fileName}`

    const arrayBuffer = await image.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload file to Supabase Storage
    const publicUrl = await uploadFile(buffer, filePath, image.type)

    // Update team record with new profile picture URL
    const { data, error } = await supabaseAdmin
      .from('teams')
      .update({ profile_picture_url: publicUrl })
      .eq('id', teamId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    // Clean up old profile pictures asynchronously in the background
    // We don't await this promise, so it runs in the background
    ;(async () => {
      try {
        // Get the current file name from the path
        const currentFileName = fileName

        // List all files in the team's folder from Supabase Storage
        const folderPath = `teams/${teamId}`
        const files = await getFiles(folderPath)

        // Delete all old profile pictures except the one we just uploaded
        for (const file of files) {
          const filePath = file.name
          // Skip the file we just uploaded
          if (filePath === `${folderPath}/${currentFileName}`) {
            continue
          }

          await deleteFile(filePath)
        }
      } catch (cleanupError) {
        logWarning('Error during profile picture cleanup:', cleanupError)
      }
    })()

    revalidatePath(`/dashboard/[teamIdOrSlug]/general`, 'page')
    revalidatePath(`/dashboard`, 'layout')

    return data
  })
