import { l } from '@/lib/clients/logger/logger'
import { PlainClient } from '@team-plain/typescript-sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createTRPCRouter } from '../init'
import { protectedProcedure } from '../procedures'

const AttachmentSchema = z.object({
  url: z.string().url(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
})

const ReportIssueSchema = z.object({
  sandboxId: z.string().min(1).optional(),
  description: z.string().min(1),
  teamId: z.string().min(1),
  teamName: z.string().min(1),
  customerEmail: z.string().email(),
  customerTier: z.string().min(1),
  attachments: z.array(AttachmentSchema).max(5).optional(),
})

function formatThreadText(input: z.infer<typeof ReportIssueSchema>): string {
  const { sandboxId, description, teamId, teamName, customerEmail, customerTier, attachments } = input

  const sections: string[] = []

  sections.push(`**Customer Email:** ${customerEmail}`)
  sections.push(`**Team:** ${teamName} (${teamId})`)
  sections.push(`**Tier:** ${customerTier}`)

  if (sandboxId) {
    sections.push(`**Sandbox ID:** ${sandboxId}`)
  }

  // Truncate description to stay within Plain's componentText limit
  const truncatedDescription = description.slice(0, 10000)
  sections.push(`\n**Description:**\n${truncatedDescription}`)

  if (attachments && attachments.length > 0) {
    sections.push(`\n**Attachments:**`)
    for (const att of attachments) {
      const sizeKB = (att.size / 1024).toFixed(1)
      sections.push(`- [${att.fileName}](${att.url}) (${att.mimeType}, ${sizeKB}KB)`)
    }
  }

  return sections.join('\n')
}

export const supportRouter = createTRPCRouter({
  reportIssue: protectedProcedure
    .input(ReportIssueSchema)
    .mutation(async ({ input, ctx }) => {
      const { sandboxId, teamName } = input
      const email = ctx.user.email

      if (!process.env.PLAIN_API_KEY) {
        l.error(
          { key: 'trpc:support:report_issue:plain_not_configured' },
          'PLAIN_API_KEY not configured'
        )
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Support API not configured',
        })
      }

      if (!email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Email not found',
        })
      }

      const client = new PlainClient({
        apiKey: process.env.PLAIN_API_KEY,
      })

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
            key: 'trpc:support:report_issue:upsert_customer_error',
            error: customerResult.error,
            user_id: ctx.user.id,
          },
          `failed to upsert customer in Plain: ${customerResult.error.message}`
        )
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create support ticket',
        })
      }

      const title = sandboxId
        ? `Dashboard Issue Report [${teamName}]: ${sandboxId}`
        : `Dashboard Issue Report [${teamName}]`

      const threadText = formatThreadText(input)

      const result = await client.createThread({
        title,
        customerIdentifier: {
          customerId: customerResult.data.customer.id,
        },
        components: [
          {
            componentText: {
              text: threadText,
            },
          },
        ],
      })

      if (result.error) {
        l.error(
          {
            key: 'trpc:support:report_issue:create_thread_error',
            error: result.error,
            user_id: ctx.user.id,
          },
          `failed to create Plain thread: ${result.error.message}`
        )
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create support ticket',
        })
      }

      return { success: true, threadId: result.data.id }
    }),
})
