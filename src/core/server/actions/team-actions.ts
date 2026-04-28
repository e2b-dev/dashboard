'use server'

import { fileTypeFromBuffer } from 'file-type'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { returnValidationErrors } from 'next-safe-action'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
import {
  CreateTeamSchema,
  UpdateTeamNameSchema,
} from '@/core/modules/teams/schemas'
import { createTeamsRepository } from '@/core/modules/teams/teams-repository.server'
import {
  authActionClient,
  withAuthedRequestRepository,
  withTeamAuthedRequestRepository,
  withTeamSlugResolution,
} from '@/core/server/actions/client'
import { toActionErrorFromRepoError } from '@/core/server/adapters/errors'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { deleteFile, getFiles, uploadFile } from '@/core/shared/clients/storage'
import { TeamSlugSchema } from '@/core/shared/schemas/team'

const withAuthedTeamsRepository = withAuthedRequestRepository(
  createTeamsRepository,
  (teamsRepository) => ({ teamsRepository })
)

const withTeamsRepository = withTeamAuthedRequestRepository(
  createTeamsRepository,
  (teamsRepository) => ({ teamsRepository })
)

export const updateTeamNameAction = authActionClient
  .schema(UpdateTeamNameSchema)
  .metadata({ actionName: 'updateTeamName' })
  .use(withTeamSlugResolution)
  .use(withTeamsRepository)
  .action(async ({ parsedInput, ctx }) => {
    const { name, teamSlug } = parsedInput
    const result = await ctx.teamsRepository.updateTeamName(name)

    if (!result.ok) {
      return toActionErrorFromRepoError(result.error)
    }

    revalidatePath(`/dashboard/${teamSlug}/general`, 'page')

    return result.data
  })

const AddTeamMemberSchema = z.object({
  teamSlug: TeamSlugSchema,
  email: z.email(),
})

export const addTeamMemberAction = authActionClient
  .schema(AddTeamMemberSchema)
  .metadata({ actionName: 'addTeamMember' })
  .use(withTeamSlugResolution)
  .use(withTeamsRepository)
  .action(async ({ parsedInput, ctx }) => {
    const { email, teamSlug } = parsedInput
    const result = await ctx.teamsRepository.addTeamMember(email)

    if (!result.ok) {
      return toActionErrorFromRepoError(result.error)
    }

    revalidatePath(`/dashboard/${teamSlug}/general`, 'page')
  })

const RemoveTeamMemberSchema = z.object({
  teamSlug: TeamSlugSchema,
  userId: z.uuid(),
})

export const removeTeamMemberAction = authActionClient
  .schema(RemoveTeamMemberSchema)
  .metadata({ actionName: 'removeTeamMember' })
  .use(withTeamSlugResolution)
  .use(withTeamsRepository)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, teamSlug } = parsedInput
    const result = await ctx.teamsRepository.removeTeamMember(userId)

    if (!result.ok) {
      return toActionErrorFromRepoError(result.error)
    }

    revalidatePath(`/dashboard/${teamSlug}/general`, 'page')
  })

export const createTeamAction = authActionClient
  .schema(CreateTeamSchema)
  .metadata({ actionName: 'createTeam' })
  .use(withAuthedTeamsRepository)
  .action(async ({ parsedInput, ctx }) => {
    const { name } = parsedInput

    const result = await ctx.teamsRepository.createTeam(name)
    if (!result.ok) {
      return toActionErrorFromRepoError(result.error)
    }

    return result.data
  })

const UploadTeamProfilePictureSchema = zfd.formData(
  z.object({
    teamSlug: zfd.text(),
    image: zfd.file(),
  })
)

export const uploadTeamProfilePictureAction = authActionClient
  .schema(UploadTeamProfilePictureSchema)
  .metadata({ actionName: 'uploadTeamProfilePicture' })
  .use(withTeamSlugResolution)
  .use(withTeamsRepository)
  .action(async ({ parsedInput, ctx }) => {
    const { image, teamSlug } = parsedInput
    const { teamId, teamsRepository } = ctx

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

    const result = await teamsRepository.updateTeamProfilePictureUrl(publicUrl)
    if (!result.ok) {
      return toActionErrorFromRepoError(result.error)
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
          error: serializeErrorForLog(cleanupError),
          team_id: teamId,
          context: {
            image: image.name,
          },
        })
      }
    })

    revalidatePath(`/dashboard/${teamSlug}/general`, 'page')

    return result.data
  })
