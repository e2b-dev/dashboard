import 'server-only'

import { AttachmentType, PlainClient } from '@team-plain/typescript-sdk'
import { createUserTeamsRepository } from '@/core/modules/teams/user-teams-repository.server'
import { l } from '@/core/shared/clients/logger/logger'
import { repoErrorFromHttp } from '@/core/shared/errors'
import type { TeamRequestScope } from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5

interface FileInput {
  name: string
  type: string
  base64: string
}

type SupportRepositoryDeps = {
  createPlainClient: () => PlainClient
}

export type SupportScope = TeamRequestScope

export interface SupportRepository {
  getTeamSupportData(): Promise<
    RepoResult<{
      name: string
      email: string
      tier: string
    }>
  >
  createSupportThread(input: {
    description: string
    files?: FileInput[]
    teamId: string
    teamName: string
    customerEmail: string
    accountOwnerEmail: string
    customerTier: string
  }): Promise<RepoResult<{ threadId: string }>>
}

function formatThreadText(input: {
  description: string
  teamId: string
  customerEmail: string
  accountOwnerEmail: string
  customerTier: string
}): string {
  const {
    description,
    teamId,
    customerEmail,
    accountOwnerEmail,
    customerTier,
  } = input

  const header = [
    '########',
    `Customer: ${customerEmail}`,
    `Account Owner: ${accountOwnerEmail}`,
    `Tier: ${customerTier}`,
    `TeamID: ${teamId}`,
    `Orbit: https://orbit.e2b.dev/teams/${teamId}/users`,
    '########',
  ].join('\n')

  const truncatedDescription = description.slice(0, 10000)

  return `${header}\n\n${truncatedDescription}`
}

async function uploadAttachmentToPlain(
  client: PlainClient,
  customerId: string,
  file: FileInput
): Promise<string> {
  const buffer = Buffer.from(file.base64, 'base64')

  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new Error(`File ${file.name} exceeds 10MB limit`)
  }

  const uploadUrlResult = await client.createAttachmentUploadUrl({
    customerId,
    fileName: file.name,
    fileSizeBytes: buffer.byteLength,
    attachmentType: AttachmentType.CustomTimelineEntry,
  })

  if (uploadUrlResult.error) {
    throw new Error(
      `Failed to create upload URL for ${file.name}: ${uploadUrlResult.error.message}`
    )
  }

  const { uploadFormUrl, uploadFormData, attachment } = uploadUrlResult.data
  const formData = new FormData()
  for (const { key, value } of uploadFormData) {
    formData.append(key, value)
  }
  formData.append('file', new Blob([buffer], { type: file.type }), file.name)

  const uploadResponse = await fetch(uploadFormUrl, {
    method: 'POST',
    body: formData,
  })

  if (!uploadResponse.ok) {
    throw new Error(
      `Failed to upload ${file.name}: ${uploadResponse.status} ${uploadResponse.statusText}`
    )
  }

  return attachment.id
}

export function createSupportRepository(
  scope: SupportScope,
  deps: SupportRepositoryDeps = {
    createPlainClient: () =>
      new PlainClient({
        apiKey: process.env.PLAIN_API_KEY ?? '',
      }),
  }
): SupportRepository {
  return {
    async getTeamSupportData() {
      const teamsResult = await createUserTeamsRepository({
        accessToken: scope.accessToken,
      }).listUserTeams()

      if (!teamsResult.ok) {
        l.error(
          {
            key: 'repositories:support:fetch_team_error',
            error: teamsResult.error,
            team_id: scope.teamId,
          },
          'failed to fetch team data'
        )
        return err(teamsResult.error)
      }

      const team = teamsResult.data.find(
        (candidate) => candidate.id === scope.teamId
      )

      if (!team) {
        return err(
          repoErrorFromHttp(403, 'Team not found or access denied', {
            teamIdOrSlug: scope.teamId,
          })
        )
      }

      return ok({ name: team.name, email: team.email, tier: team.tier })
    },
    async createSupportThread(input) {
      if (!process.env.PLAIN_API_KEY) {
        return err(repoErrorFromHttp(500, 'Support API not configured'))
      }

      const {
        description,
        files,
        teamId,
        teamName,
        customerEmail,
        accountOwnerEmail,
        customerTier,
      } = input

      const client = deps.createPlainClient()
      const customerResult = await client.upsertCustomer({
        identifier: {
          emailAddress: customerEmail,
        },
        onCreate: {
          email: {
            email: customerEmail,
            isVerified: true,
          },
          fullName: customerEmail,
        },
        onUpdate: {},
      })

      if (customerResult.error) {
        return err(
          repoErrorFromHttp(
            500,
            'Failed to create support ticket',
            customerResult.error
          )
        )
      }

      const customerId = customerResult.data.customer.id
      const attachmentIds: string[] = []
      const validFiles = (files ?? []).slice(0, MAX_FILES)

      for (const file of validFiles) {
        try {
          const attachmentId = await uploadAttachmentToPlain(
            client,
            customerId,
            file
          )
          attachmentIds.push(attachmentId)
        } catch {}
      }

      const title = `Support Request [${teamName}]`
      const threadText = formatThreadText({
        description,
        teamId,
        customerEmail,
        accountOwnerEmail,
        customerTier,
      })

      const result = await client.createThread({
        title,
        customerIdentifier: {
          customerId,
        },
        components: [
          {
            componentText: {
              text: threadText,
            },
          },
        ],
        ...(attachmentIds.length > 0 ? { attachmentIds } : {}),
      })

      if (result.error) {
        return err(
          repoErrorFromHttp(
            500,
            'Failed to create support ticket',
            result.error
          )
        )
      }

      return ok({ threadId: result.data.id })
    },
  }
}
