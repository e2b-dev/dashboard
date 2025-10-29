import { authActionClient } from '@/lib/clients/action'
import 'server-only'
import z from 'zod'

const GetAddOnInfoSchema = z.object({
  teamId: z.uuid(),
})

export const getAddOnInfo = authActionClient
  .metadata({ serverFunctionName: 'getBillingStatus' })
  .inputSchema(GetAddOnInfoSchema)
  .action(async () => {
    return {}
  })
