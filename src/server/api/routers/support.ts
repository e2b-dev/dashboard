import { l } from '@/lib/clients/logger/logger'
import { PlainClient } from '@team-plain/typescript-sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createTRPCRouter } from '../init'
import { protectedProcedure } from '../procedures'

const ReportIssueSchema = z.object({
  sandboxId: z.string().min(1).optional(),
  description: z.string().min(1),
})

export const supportRouter = createTRPCRouter({
  reportIssue: protectedProcedure
    .input(ReportIssueSchema)
    .mutation(async ({ input, ctx }) => {
      const { sandboxId, description } = input
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

      const result = await client.createThread({
        title: sandboxId
          ? `Dashboard Issue Report: ${sandboxId}`
          : 'Dashboard Issue Report',
        customerIdentifier: {
          customerId: customerResult.data.customer.id,
        },
        components: [
          {
            componentText: {
              text: sandboxId
                ? `**Sandbox ID:** ${sandboxId}\n\n**Description:**\n${description}`
                : `**Description:**\n${description}`,
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
