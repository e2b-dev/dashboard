import 'server-only'

import { AttachmentType, PlainClient } from '@team-plain/typescript-sdk'
import { TRPCError } from '@trpc/server'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file
const MAX_FILES = 5

interface FileInput {
  name: string
  type: string
  base64: string
}

function formatTierName(tier: string): string {
  const tierMap: Record<string, string> = {
    base_v1: 'Hobby',
    pro_v1: 'Pro',
    pro_v1_startups_program: 'Pro-Startup',
  }
  return tierMap[tier] ?? tier
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
    `Tier: ${formatTierName(customerTier)}`,
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

  l.info(
    {
      key: 'repositories:support:attachment_upload_start',
      file_name: file.name,
      file_size: buffer.byteLength,
      file_type: file.type,
      customer_id: customerId,
    },
    `starting attachment upload for ${file.name} (${buffer.byteLength} bytes, type: ${file.type})`
  )

  const uploadUrlResult = await client.createAttachmentUploadUrl({
    customerId,
    fileName: file.name,
    fileSizeBytes: buffer.byteLength,
    attachmentType: AttachmentType.CustomTimelineEntry,
  })

  if (uploadUrlResult.error) {
    l.error(
      {
        key: 'repositories:support:attachment_create_url_error',
        error: uploadUrlResult.error,
        file_name: file.name,
      },
      `failed to create upload URL for ${file.name}: ${uploadUrlResult.error.message}`
    )
    throw new Error(
      `Failed to create upload URL for ${file.name}: ${uploadUrlResult.error.message}`
    )
  }

  const { uploadFormUrl, uploadFormData, attachment } = uploadUrlResult.data

  l.info(
    {
      key: 'repositories:support:attachment_uploading',
      file_name: file.name,
      attachment_id: attachment.id,
      upload_url: uploadFormUrl,
      form_data_keys: uploadFormData.map((d) => d.key),
    },
    `uploading ${file.name} to Plain (attachment: ${attachment.id})`
  )

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
    const responseText = await uploadResponse
      .text()
      .catch(() => 'unable to read response body')
    l.error(
      {
        key: 'repositories:support:attachment_upload_failed',
        file_name: file.name,
        status: uploadResponse.status,
        status_text: uploadResponse.statusText,
        response_body: responseText,
      },
      `failed to upload ${file.name}: ${uploadResponse.status} ${uploadResponse.statusText} - ${responseText}`
    )
    throw new Error(
      `Failed to upload ${file.name}: ${uploadResponse.status} ${uploadResponse.statusText}`
    )
  }

  l.info(
    {
      key: 'repositories:support:attachment_upload_success',
      file_name: file.name,
      attachment_id: attachment.id,
    },
    `successfully uploaded ${file.name} (attachment: ${attachment.id})`
  )

  return attachment.id
}

export async function getTeamSupportData(teamId: string) {
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('name, email, tier')
    .eq('id', teamId)
    .single()

  if (teamError || !team) {
    l.error(
      {
        key: 'repositories:support:fetch_team_error',
        error: teamError,
        team_id: teamId,
      },
      `failed to fetch team data: ${teamError?.message}`
    )
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to load team information',
    })
  }

  return team
}

export async function createSupportThread(input: {
  description: string
  files?: FileInput[]
  teamId: string
  teamName: string
  customerEmail: string
  accountOwnerEmail: string
  customerTier: string
}) {
  const {
    description,
    files,
    teamId,
    teamName,
    customerEmail,
    accountOwnerEmail,
    customerTier,
  } = input

  if (!process.env.PLAIN_API_KEY) {
    l.error(
      { key: 'repositories:support:plain_not_configured' },
      'PLAIN_API_KEY not configured'
    )
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Support API not configured',
    })
  }

  const client = new PlainClient({
    apiKey: process.env.PLAIN_API_KEY,
  })

  // Upsert customer in Plain
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
    l.error(
      {
        key: 'repositories:support:upsert_customer_error',
        error: customerResult.error,
        customer_email: customerEmail,
      },
      `failed to upsert customer in Plain: ${customerResult.error.message}`
    )
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create support ticket',
    })
  }

  const customerId = customerResult.data.customer.id

  // Upload attachments to Plain
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
    } catch (err) {
      l.warn(
        {
          key: 'repositories:support:attachment_upload_error',
          error: err,
          file_name: file.name,
        },
        `failed to upload attachment ${file.name}`
      )
      // Continue with remaining files
    }
  }

  // Create thread
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
    l.error(
      {
        key: 'repositories:support:create_thread_error',
        error: result.error,
        customer_email: customerEmail,
      },
      `failed to create Plain thread: ${result.error.message}`
    )
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create support ticket',
    })
  }

  return { threadId: result.data.id }
}

export const supportRepo = {
  getTeamSupportData,
  createSupportThread,
}
