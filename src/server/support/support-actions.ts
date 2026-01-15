'use server'

import { authActionClient } from '@/lib/clients/action'
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

    console.log('reportIssueAction', { sandboxId, description, email })

    // TODO: Call Plain API
    // - email
    // - sandboxId
    // - description

    return { success: true }
  })
