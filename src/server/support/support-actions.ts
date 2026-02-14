'use server'

import { authActionClient } from '@/lib/clients/action'
import { uploadFile } from '@/lib/clients/storage'
import { ISSUE_ATTACHMENTS_BUCKET_NAME } from '@/configs/storage'
import { fileTypeFromBuffer } from 'file-type'
import { returnValidationErrors } from 'next-safe-action'
import { z } from 'zod'
import { zfd } from 'zod-form-data'

const UploadIssueAttachmentSchema = zfd.formData(
  z.object({
    file: zfd.file(),
  })
)

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const uploadIssueAttachmentAction = authActionClient
  .schema(UploadIssueAttachmentSchema)
  .metadata({ actionName: 'uploadIssueAttachment' })
  .action(async ({ parsedInput, ctx }) => {
    const { file } = parsedInput
    const userId = ctx.user.id

    if (file.size > MAX_FILE_SIZE) {
      return returnValidationErrors(UploadIssueAttachmentSchema, {
        file: { _errors: ['File size must be less than 10MB'] },
      })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const fileType = await fileTypeFromBuffer(buffer)

    // For text/plain, fileType may be null (no magic bytes for text files)
    const detectedMime = fileType?.mime ?? file.type

    if (!ALLOWED_MIME_TYPES.includes(detectedMime)) {
      return returnValidationErrors(UploadIssueAttachmentSchema, {
        file: {
          _errors: [
            `File type ${detectedMime} is not allowed. Allowed: images, PDF, and text files.`,
          ],
        },
      })
    }

    const extension =
      fileType?.ext ?? file.name.split('.').pop() ?? 'bin'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
    const filePath = `users/${userId}/${fileName}`

    const publicUrl = await uploadFile(
      buffer,
      filePath,
      detectedMime,
      ISSUE_ATTACHMENTS_BUCKET_NAME
    )

    return {
      url: publicUrl,
      fileName: file.name,
      mimeType: detectedMime,
      size: file.size,
    }
  })
