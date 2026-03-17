'use server'

import { fileTypeFromBuffer } from 'file-type'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { returnValidationErrors } from 'next-safe-action'
import { serializeError } from 'serialize-error'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { api } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { deleteFile, getFiles, uploadFile } from '@/lib/clients/storage'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { handleDefaultInfraError, returnServerError } from '@/lib/utils/action'
import { CreateTeamSchema, UpdateTeamNameSchema } from '@/server/team/types'
import type { CreateTeamsResponse } from '@/types/billing.types'

export const updateTeamNameAction = authActionClient
  .schema(UpdateTeamNameSchema)
  .metadata({ actionName: 'updateTeamName' })
  .use(withTeamIdResolution)
  .action(async ({ parsedInput, ctx }) => {
    const { name, teamIdOrSlug } = parsedInput
    const { teamId, session } = ctx

    const { data, error } = await api.PATCH('/teams/{teamId}', {
      params: { path: { teamId } },
      headers: SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      body: { name },
    })

    if (error) {
      return returnServerError('Failed to update team name')
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
    const { teamId, session } = ctx

    const { error } = await api.POST('/teams/{teamId}/members', {
      params: { path: { teamId } },
      headers: SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      body: { email },
    })

    if (error) {
      const message =
        (error as { message?: string }).message ?? 'Failed to add team member'
      return returnServerError(message)
    }

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
    const { teamId, session } = ctx

    const { error } = await api.DELETE('/teams/{teamId}/members/{userId}', {
      params: { path: { teamId, userId } },
      headers: SUPABASE_AUTH_HEADERS(session.access_token, teamId),
    })

    if (error) {
      const message =
        (error as { message?: string }).message ??
        'Failed to remove team member'
      return returnServerError(message)
    }

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

    const allowedTypes = ['image/jpeg', 'image/png']

    if (!allowedTypes.includes(image.type)) {
      return returnValidationErrors(UploadTeamProfilePictureSchema, {
        image: { _errors: ['File must be JPG or PNG format'] },
      })
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024

    if (image.size > MAX_FILE_SIZE) {
      return returnValidationErrors(UploadTeamProfilePictureSchema, {
        image: { _errors: ['File size must be less than 5MB'] },
      })
    }

    const arrayBuffer = await image.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

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

    const extension = fileType.ext
    const fileName = `${Date.now()}.${extension}`
    const storagePath = `teams/${teamId}/${fileName}`

    const publicUrl = await uploadFile(buffer, storagePath, fileType.mime)

    // profile_picture_url stays on supabase admin — tightly coupled to supabase storage
    const { data, error } = await supabaseAdmin
      .from('teams')
      .update({ profile_picture_url: publicUrl })
      .eq('id', teamId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    after(async () => {
      try {
        const currentFileName = fileName
        const folderPath = `teams/${teamId}`
        const files = await getFiles(folderPath)

        for (const file of files) {
          const filePath = file.name
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
