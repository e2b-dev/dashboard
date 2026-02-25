'use server'

import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { ActionError } from '@/lib/utils/action'
import { AttachmentType, PlainClient } from '@team-plain/typescript-sdk'
import { z } from 'zod'
import { zfd } from 'zod-form-data'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB (Plain's limit for threads)
const MAX_FILES = 5

const ContactSupportSchema = zfd.formData(
  z.object({
    description: zfd.text(z.string().min(1)),
    teamIdOrSlug: zfd.text(z.string().min(1)),
    files: zfd.repeatableOfType(zfd.file()).optional(),
  })
)

function formatTierName(tier: string): string {
  const tierMap: Record<string, string> = {
    base_v1: 'Hobby',
    pro_v1: 'Pro',
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
  const { description, teamId, customerEmail, accountOwnerEmail, customerTier } = input

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
  file: File
): Promise<string> {
  l.info(
    {
      key: 'support:contact:attachment_upload_start',
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      customer_id: customerId,
    },
    `starting attachment upload for ${file.name} (${file.size} bytes, type: ${file.type})`
  )

  const uploadUrlResult = await client.createAttachmentUploadUrl({
    customerId,
    fileName: file.name,
    fileSizeBytes: file.size,
    attachmentType: AttachmentType.CustomTimelineEntry,
  })

  if (uploadUrlResult.error) {
    l.error(
      {
        key: 'support:contact:attachment_create_url_error',
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
      key: 'support:contact:attachment_uploading',
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
  formData.append('file', file)

  const uploadResponse = await fetch(uploadFormUrl, {
    method: 'POST',
    body: formData,
  })

  if (!uploadResponse.ok) {
    const responseText = await uploadResponse.text().catch(() => 'unable to read response body')
    l.error(
      {
        key: 'support:contact:attachment_upload_failed',
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
      key: 'support:contact:attachment_upload_success',
      file_name: file.name,
      attachment_id: attachment.id,
    },
    `successfully uploaded ${file.name} (attachment: ${attachment.id})`
  )

  return attachment.id
}

export const contactSupportAction = authActionClient
  .schema(ContactSupportSchema)
  .metadata({ actionName: 'contactSupport' })
  .use(withTeamIdResolution)
  .action(async ({ parsedInput, ctx }) => {
    const { description, files } = parsedInput
    const { teamId, user } = ctx
    const email = user.email

    if (!process.env.PLAIN_API_KEY) {
      l.error(
        { key: 'support:contact:plain_not_configured' },
        'PLAIN_API_KEY not configured'
      )
      throw new ActionError('Support API not configured')
    }

    if (!email) {
      throw new ActionError('Email not found')
    }

    // Fetch team data server-side to prevent spoofing
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('name, email, tier')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      l.error(
        {
          key: 'support:contact:fetch_team_error',
          error: teamError,
          team_id: teamId,
        },
        `failed to fetch team data: ${teamError?.message}`
      )
      throw new ActionError('Failed to load team information')
    }

    const teamName = team.name
    const accountOwnerEmail = team.email
    const customerTier = team.tier

    const client = new PlainClient({
      apiKey: process.env.PLAIN_API_KEY,
    })

    // Upsert customer in Plain
    const customerResult = await client.upsertCustomer({
      identifier: {
        emailAddress: email,
      },
      onCreate: {
        email: {
          email,
          isVerified: true,
        },
        fullName: email,
      },
      onUpdate: {},
    })

    if (customerResult.error) {
      l.error(
        {
          key: 'support:contact:upsert_customer_error',
          error: customerResult.error,
          user_id: ctx.user.id,
        },
        `failed to upsert customer in Plain: ${customerResult.error.message}`
      )
      throw new ActionError('Failed to create support ticket')
    }

    const customerId = customerResult.data.customer.id

    // Upload attachments to Plain
    const attachmentIds: string[] = []

    const validFiles = (files ?? [])
      .filter((f) => f.size <= MAX_FILE_SIZE)
      .slice(0, MAX_FILES)

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
            key: 'support:contact:attachment_upload_error',
            error: err,
            user_id: ctx.user.id,
            file_name: file.name,
          },
          `failed to upload attachment ${file.name}`
        )
        // Continue with remaining files
      }
    }

    // Create thread with header + customer's message and attachments
    const title = `Support Request [${teamName}]`
    const threadText = formatThreadText({
      description,
      teamId,
      customerEmail: email,
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
          key: 'support:contact:create_thread_error',
          error: result.error,
          user_id: ctx.user.id,
        },
        `failed to create Plain thread: ${result.error.message}`
      )
      throw new ActionError('Failed to create support ticket')
    }

    return { success: true, threadId: result.data.id }
  })
