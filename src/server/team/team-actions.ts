'use server'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { CACHE_TAGS } from '@/configs/cache'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { l } from '@/lib/clients/logger/logger'
import { deleteFile, getFiles, uploadFile } from '@/lib/clients/storage'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { handleDefaultInfraError, returnServerError } from '@/lib/utils/action'
import { CreateTeamSchema, UpdateTeamNameSchema } from '@/server/team/types'
import { CreateTeamsResponse } from '@/types/billing.types'
import { fileTypeFromBuffer } from 'file-type'
import { returnValidationErrors } from 'next-safe-action'
import { revalidatePath, revalidateTag } from 'next/cache'
import { after } from 'next/server'
import { serializeError } from 'serialize-error'
import { z } from 'zod'
import { zfd } from 'zod-form-data'

export const updateTeamNameAction = authActionClient
  .schema(UpdateTeamNameSchema)
  .metadata({ actionName: 'updateTeamName' })

  .use(withTeamIdResolution)
  .action(async ({ parsedInput, ctx }) => {
    const { name, teamIdOrSlug } = parsedInput
    const { teamId } = ctx

    const { data, error } = await supabaseAdmin
      .from('teams')
      .update({ name })
      .eq('id', teamId)
      .select()
      .single()

    if (error) {
      return returnServerError(`Failed to update team name: ${error.message}`)
    }

    revalidatePath(`/dashboard/${teamIdOrSlug}/general`, 'page')

    return data
  })

const AddTeamMemberSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
  email: z.email(),
})

export const addTeamMemberAction = authActionClient
  .schema(AddTeamMemberSchema)
  .metadata({ actionName: 'addTeamMember' })
  .use(withTeamIdResolution)
  .action(async ({ parsedInput, ctx }) => {
    const { email, teamIdOrSlug } = parsedInput
    const { teamId, user } = ctx

    const { data: existingUsers, error: userError } = await supabaseAdmin
      .from('auth_users')
      .select('*')
      .eq('email', email)

    if (userError) {
      return returnServerError(`Error finding user: ${userError.message}`)
    }

    const existingUser = existingUsers?.[0]

    if (!existingUser || !existingUser.id) {
      return returnServerError(
        'User with this email address does not exist. Please ask them to sign up first and try again.'
      )
    }

    const { data: existingTeamMember } = await supabaseAdmin
      .from('users_teams')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', existingUser.id)
      .single()

    if (existingTeamMember) {
      return returnServerError('User is already a member of this team')
    }

    const { error: insertError } = await supabaseAdmin
      .from('users_teams')
      .insert({
        team_id: teamId,
        user_id: existingUser.id,
        added_by: user.id,
      })

    if (insertError) {
      return returnServerError(
        `Failed to add team member: ${insertError.message}`
      )
    }

    revalidateTag(CACHE_TAGS.USER_TEAM_AUTHORIZATION(existingUser.id, teamId), {
      expire: 0,
    })
    revalidatePath(`/dashboard/${teamIdOrSlug}/general`, 'page')
  })

const RemoveTeamMemberSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
  userId: z.uuid(),
})

export const removeTeamMemberAction = authActionClient
  .schema(RemoveTeamMemberSchema)
  .metadata({ actionName: 'removeTeamMember' })
  .use(withTeamIdResolution)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, teamIdOrSlug } = parsedInput
    const { teamId, user } = ctx

    const { data: teamMemberData, error: teamMemberError } = await supabaseAdmin
      .from('users_teams')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (teamMemberError || !teamMemberData || teamMemberData.length === 0) {
      return returnServerError('User is not a member of this team')
    }

    const teamMember = teamMemberData[0]!

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

    revalidateTag(CACHE_TAGS.USER_TEAM_AUTHORIZATION(userId, teamId), {
      expire: 0,
    })
    revalidatePath(`/dashboard/${teamIdOrSlug}/general`, 'page')
  })

export const createTeamAction = authActionClient
  .schema(CreateTeamSchema)
  .metadata({ actionName: 'createTeam' })
  .action(async ({ parsedInput, ctx }) => {
    const { name } = parsedInput
    const { session } = ctx

    const response = await fetch(`${process.env.BILLING_API_URL}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...SUPABASE_AUTH_HEADERS(session.access_token),
      },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      const status = response.status
      const error = await response.json()

      if (status === 400) {
        return returnServerError(error?.message ?? 'Failed to create team')
      }

      return handleDefaultInfraError(status)
    }

    const data = (await response.json()) as CreateTeamsResponse

    return data
  })

const UploadTeamProfilePictureSchema = zfd.formData(
  z.object({
    teamIdOrSlug: zfd.text(),
    image: zfd.file(),
  })
)

export const uploadTeamProfilePictureAction = authActionClient
  .schema(UploadTeamProfilePictureSchema)
  .metadata({ actionName: 'uploadTeamProfilePicture' })
  .use(withTeamIdResolution)
  .action(async ({ parsedInput, ctx }) => {
    const { image, teamIdOrSlug } = parsedInput
    const { teamId } = ctx

    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml']

    if (!allowedTypes.includes(image.type)) {
      return returnValidationErrors(UploadTeamProfilePictureSchema, {
        image: { _errors: ['File must be JPG or PNG format'] },
      })
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

    if (image.size > MAX_FILE_SIZE) {
      return returnValidationErrors(UploadTeamProfilePictureSchema, {
        image: { _errors: ['File size must be less than 5MB'] },
      })
    }

    const arrayBuffer = await image.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Verify actual file type using magic bytes (file signature)
    const fileType = await fileTypeFromBuffer(buffer)

    if (!fileType) {
      return returnValidationErrors(UploadTeamProfilePictureSchema, {
        image: { _errors: ['Unable to determine file type'] },
      })
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png']
    if (!allowedMimeTypes.includes(fileType.mime)) {
      return returnValidationErrors(UploadTeamProfilePictureSchema, {
        image: {
          _errors: [
            'Invalid file type. Only JPEG and PNG images are allowed. File appears to be: ' +
              fileType.mime,
          ],
        },
      })
    }

    // Use the actual detected extension from file-type
    const extension = fileType.ext
    const fileName = `${Date.now()}.${extension}`
    const filePath = `teams/${teamId}/${fileName}`

    // Upload file to Supabase Storage
    const publicUrl = await uploadFile(buffer, filePath, fileType.mime)

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
    after(async () => {
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
        l.warn({
          key: 'upload_team_profile_picture_action:cleanup_error',
          error: serializeError(cleanupError),
          team_id: teamId,
          context: {
            image: image.name,
          },
        })
      }
    })

    revalidatePath(`/dashboard/${teamIdOrSlug}/general`, 'page')

    return data
  })
