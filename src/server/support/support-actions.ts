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
    customerTier: zfd.text(z.string().min(1)),
    files: zfd.repeatableOfType(zfd.file()).optional(),
  })
)

function formatThreadText(input: {
  description: string
  teamId: string
  teamName: string
  customerEmail: string
  customerTier: string
}): string {
  const { description, teamId, teamName, customerEmail, customerTier } = input

  const sections: string[] = []

  sections.push(`**Customer Email:** ${customerEmail}`)
  sections.push(`**Team:** ${teamName} (${teamId})`)
  sections.push(`**Tier:** ${customerTier}`)

  const truncatedDescription = description.slice(0, 10000)
  sections.push(`\n**Message:**\n${truncatedDescription}`)

  return sections.join('\n')
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
    const { description, teamId, teamName, customerEmail, customerTier, files } =
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

    // Create thread
    const title = `Support Request [${teamName}]`
    const threadText = formatThreadText({
      description,
      teamId,
      teamName,
      customerEmail,
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
      throw new Error('Failed to create support ticket')
    }

    return { success: true, threadId: result.data.id }
  })
