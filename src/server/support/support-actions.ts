'use server'

import { authActionClient } from '@/lib/clients/action'
import { l } from '@/lib/clients/logger/logger'
import { AttachmentType, PlainClient } from '@team-plain/typescript-sdk'
import { z } from 'zod'
import { zfd } from 'zod-form-data'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB (Plain's limit for threads)
const MAX_FILES = 5

const ContactSupportSchema = zfd.formData(
  z.object({
    description: zfd.text(z.string().min(1)),
    teamId: zfd.text(z.string().min(1)),
    teamName: zfd.text(z.string().min(1)),
    customerEmail: zfd.text(z.string().email()),
    accountOwnerEmail: zfd.text(z.string().email()),
    customerTier: zfd.text(z.string().min(1)),
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

function formatNoteText(input: {
  teamId: string
  customerEmail: string
  accountOwnerEmail: string
  customerTier: string
}): string {
  const { teamId, customerEmail, accountOwnerEmail, customerTier } = input

  return [
    '########',
    `Customer: ${customerEmail}`,
    `Account Owner: ${accountOwnerEmail}`,
    `Tier: ${formatTierName(customerTier)}`,
    `TeamID: ${teamId}`,
    `Orbit: https://orbit.e2b.dev/teams/${teamId}/users`,
    '########',
  ].join('\n')
}

async function uploadAttachmentToPlain(
  client: PlainClient,
  customerId: string,
  file: File
): Promise<string> {
  const uploadUrlResult = await client.createAttachmentUploadUrl({
    customerId,
    fileName: file.name,
    fileSizeBytes: file.size,
    attachmentType: AttachmentType.Chat,
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
  formData.append('file', file)

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

export const contactSupportAction = authActionClient
  .schema(ContactSupportSchema)
  .metadata({ actionName: 'contactSupport' })
  .action(async ({ parsedInput, ctx }) => {
    const { description, teamId, teamName, customerEmail, accountOwnerEmail, customerTier, files } =
      parsedInput
    const email = ctx.user.email

    if (!process.env.PLAIN_API_KEY) {
      l.error(
        { key: 'support:contact:plain_not_configured' },
        'PLAIN_API_KEY not configured'
      )
      throw new Error('Support API not configured')
    }

    if (!email) {
      throw new Error('Email not found')
    }

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
      throw new Error('Failed to create support ticket')
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

    // Create thread (without deprecated components/attachmentIds)
    const title = `Support Request [${teamName}]`
    const truncatedDescription = description.slice(0, 10000)

    const result = await client.createThread({
      title,
      customerIdentifier: {
        customerId,
      },
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
      throw new Error('Failed to create support ticket')
    }

    const threadId = result.data.id

    // Send customer message with attachments via sendCustomerChat
    const chatResult = await client.sendCustomerChat({
      customerId,
      threadId,
      text: truncatedDescription,
      ...(attachmentIds.length > 0 ? { attachmentIds } : {}),
    })

    if (chatResult.error) {
      l.error(
        {
          key: 'support:contact:send_chat_error',
          error: chatResult.error,
          user_id: ctx.user.id,
        },
        `failed to send customer chat: ${chatResult.error.message}`
      )
      // Thread exists but message failed — still report as error
      throw new Error('Failed to send support message')
    }

    // Add metadata as an internal note (not visible in email replies)
    const noteText = formatNoteText({
      teamId,
      customerEmail,
      accountOwnerEmail,
      customerTier,
    })

    const noteResult = await client.createNote({
      customerId,
      threadId,
      text: noteText,
    })

    if (noteResult.error) {
      l.warn(
        {
          key: 'support:contact:create_note_error',
          error: noteResult.error,
          user_id: ctx.user.id,
        },
        `failed to add metadata note to thread: ${noteResult.error.message}`
      )
      // Non-fatal: thread was already created successfully
    }

    return { success: true, threadId }
  })
