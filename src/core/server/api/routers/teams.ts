import { TRPCError } from '@trpc/server'
import { fileTypeFromBuffer } from 'file-type'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { z } from 'zod'
import { createKeysRepository } from '@/core/modules/keys/repository.server'
import { CreateApiKeySchema } from '@/core/modules/keys/schemas'
import {
  AddTeamMemberSchema,
  CreateTeamSchema,
  RemoveTeamMemberSchema,
  TeamNameSchema,
} from '@/core/modules/teams/schemas'
import { createTeamsRepository } from '@/core/modules/teams/teams-repository.server'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { throwTRPCErrorFromRepoError } from '@/core/server/adapters/errors'
import {
  withAuthedRequestRepository,
  withTeamAuthedRequestRepository,
} from '@/core/server/api/middlewares/repository'
import { createTRPCRouter } from '@/core/server/trpc/init'
import {
  protectedProcedure,
  protectedTeamProcedure,
} from '@/core/server/trpc/procedures'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { deleteFile, getFiles, uploadFile } from '@/core/shared/clients/storage'
import { FileSchema } from '@/core/shared/schemas/file'

const MAX_FILE_SIZE = 5 * 1024 * 1024

const userTeamsRepositoryProcedure = protectedProcedure.use(
  withAuthedRequestRepository(
    createUserTeamsRepository,
    (userTeamsRepository) => ({
      userTeamsRepository,
    })
  )
)

const teamsRepositoryProcedure = protectedTeamProcedure.use(
  withTeamAuthedRequestRepository(createTeamsRepository, (teamsRepository) => ({
    teamsRepository,
  }))
)

const keysRepositoryProcedure = protectedTeamProcedure.use(
  withTeamAuthedRequestRepository(createKeysRepository, (keysRepository) => ({
    keysRepository,
  }))
)

const getStorageFilePath = (folderPath: string, fileName: string) =>
  `${folderPath}/${fileName}`

export const teamsRouter = createTRPCRouter({
  list: userTeamsRepositoryProcedure.query(async ({ ctx }) => {
    const teamsResult = await ctx.userTeamsRepository.listUserTeams()

    if (!teamsResult.ok) {
      throwTRPCErrorFromRepoError(teamsResult.error)
    }

    return teamsResult.data
  }),

  listApiKeys: keysRepositoryProcedure.query(async ({ ctx }) => {
    const result = await ctx.keysRepository.listTeamApiKeys()

    if (!result.ok) {
      throwTRPCErrorFromRepoError(result.error)
    }

    return { apiKeys: result.data }
  }),

  createApiKey: keysRepositoryProcedure
    .input(CreateApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      const { name } = input

      const result = await ctx.keysRepository.createApiKey(name)

      if (!result.ok) {
        l.error({
          key: 'create_api_key_trpc:error',
          message: result.error.message,
          error: result.error,
          team_id: ctx.teamId,
          user_id: ctx.session.user.id,
          context: { name },
        })

        throwTRPCErrorFromRepoError(result.error)
      }

      return { createdApiKey: result.data }
    }),

  deleteApiKey: keysRepositoryProcedure
    .input(
      z.object({
        apiKeyId: z.uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { apiKeyId } = input

      const result = await ctx.keysRepository.deleteApiKey(apiKeyId)

      if (!result.ok) {
        l.error({
          key: 'delete_api_key_trpc:error',
          message: result.error.message,
          error: result.error,
          team_id: ctx.teamId,
          user_id: ctx.session.user.id,
          context: { apiKeyId },
        })

        throwTRPCErrorFromRepoError(result.error)
      }

      return undefined
    }),

  create: userTeamsRepositoryProcedure
    .input(CreateTeamSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.userTeamsRepository.createTeam(input.name)

      if (!result.ok) throwTRPCErrorFromRepoError(result.error)

      return result.data
    }),
  members: teamsRepositoryProcedure.query(async ({ ctx }) => {
    const result = await ctx.teamsRepository.listTeamMembers()

    if (!result.ok) throwTRPCErrorFromRepoError(result.error)

    return result.data
  }),
  updateName: teamsRepositoryProcedure
    .input(
      z.object({
        name: TeamNameSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.teamsRepository.updateTeamName(input.name)

      if (!result.ok) throwTRPCErrorFromRepoError(result.error)

      revalidatePath(`/dashboard/${input.teamSlug}/general`, 'page')

      return result.data
    }),
  addMember: teamsRepositoryProcedure
    .input(AddTeamMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.teamsRepository.addTeamMember(input.email)

      if (!result.ok) throwTRPCErrorFromRepoError(result.error)

      revalidatePath(`/dashboard/${input.teamSlug}/members`, 'page')
    }),
  removeMember: teamsRepositoryProcedure
    .input(RemoveTeamMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.teamsRepository.removeTeamMember(input.userId)

      if (!result.ok) throwTRPCErrorFromRepoError(result.error)

      revalidatePath(`/dashboard/${input.teamSlug}/members`, 'page')
    }),
  removeProfilePicture: teamsRepositoryProcedure.mutation(
    async ({ ctx, input }) => {
      const result = await ctx.teamsRepository.updateTeamProfilePictureUrl(null)

      if (!result.ok) throwTRPCErrorFromRepoError(result.error)

      after(async () => {
        try {
          const folderPath = `teams/${ctx.teamId}`

          const files = await getFiles(folderPath)

          for (const file of files) {
            await deleteFile(getStorageFilePath(folderPath, file.name))
          }
        } catch (cleanupError) {
          l.warn({
            key: 'remove_team_profile_picture_trpc:cleanup_error',
            error: serializeErrorForLog(cleanupError),
            team_id: ctx.teamId,
          })
        }
      })

      revalidatePath(`/dashboard/${input.teamSlug}/general`, 'page')

      return result.data
    }
  ),
  uploadProfilePicture: teamsRepositoryProcedure
    .input(
      z.object({
        image: FileSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const allowedTypes = ['image/jpeg', 'image/png']
      if (!allowedTypes.includes(input.image.type)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File must be JPG or PNG format',
        })
      }

      const buffer = Buffer.from(input.image.base64, 'base64')
      if (buffer.length > MAX_FILE_SIZE) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File size must be less than 5MB',
        })
      }

      const fileType = await fileTypeFromBuffer(buffer)
      if (!fileType) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Unable to determine file type',
        })
      }

      const allowedMimeTypes = ['image/jpeg', 'image/png']
      if (!allowedMimeTypes.includes(fileType.mime)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid file type. Only JPEG and PNG images are allowed. File appears to be: ${fileType.mime}`,
        })
      }

      const fileName = `${Date.now()}.${fileType.ext}`
      const storagePath = getStorageFilePath(`teams/${ctx.teamId}`, fileName)
      const publicUrl = await uploadFile(buffer, storagePath, fileType.mime)

      const result =
        await ctx.teamsRepository.updateTeamProfilePictureUrl(publicUrl)
      if (!result.ok) throwTRPCErrorFromRepoError(result.error)

      after(async () => {
        try {
          const folderPath = `teams/${ctx.teamId}`
          const currentFilePath = getStorageFilePath(folderPath, fileName)
          const files = await getFiles(folderPath)

          for (const file of files) {
            const filePath = getStorageFilePath(folderPath, file.name)
            if (filePath === currentFilePath) continue

            await deleteFile(filePath)
          }
        } catch (cleanupError) {
          l.warn({
            key: 'upload_team_profile_picture_trpc:cleanup_error',
            error: serializeErrorForLog(cleanupError),
            team_id: ctx.teamId,
            context: {
              image: input.image.name,
            },
          })
        }
      })

      revalidatePath(`/dashboard/${input.teamSlug}/general`, 'page')

      return result.data
    }),
})
