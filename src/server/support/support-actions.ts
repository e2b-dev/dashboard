'use server'

import { authActionClient } from '@/lib/clients/action'
import { PlainClient } from '@team-plain/typescript-sdk'
import { z } from 'zod'

const ReportIssueSchema = z.object({
  sandboxId: z.string().min(1, 'Sandbox ID is required'),
  description: z.string().min(1, 'Description is required'),
})

export const reportIssueAction = authActionClient
  .schema(ReportIssueSchema)
  .metadata({ actionName: 'reportIssue' })
  .action(async ({ parsedInput, ctx }) => {
    const { sandboxId, description } = parsedInput
    const email = ctx.user.email

    if (!process.env.PLAIN_API_KEY) {
      console.error('PLAIN_API_KEY not configured')
      return { success: false, error: 'Support API not configured' }
    }

    if (!email) {
      console.error('Email not found')
      return { success: false, error: 'Email not found' }
    }

    const client = new PlainClient({
      apiKey: process.env.PLAIN_API_KEY,
    })

    // First, upsert the customer to ensure they exist
    const customerResult = await client.upsertCustomer({
      identifier: {
        emailAddress: email,
      },
      onCreate: {
        email: {
          email,
          isVerified: true,
        },
        fullName: email
      },
      onUpdate: {},
    })

    if (customerResult.error) {
      console.error('Failed to upsert customer in Plain:', customerResult.error)
      return { success: false, error: customerResult.error.message }
    }

    const result = await client.createThread({
      title: `Dashboard Issue Report: ${sandboxId}`,
      customerIdentifier: {
        customerId: customerResult.data.customer.id,
      },
      components: [
        {
          componentText: {
            text: `**Sandbox ID:** ${sandboxId}\n\n**Description:**\n${description}`,
          },
        },
      ],
    })

    if (result.error) {
      console.error('Failed to create Plain thread:', result.error)
      return { success: false, error: result.error.message }
    }

    return { success: true, threadId: result.data.id }
  })
