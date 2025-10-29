import { authActionClient } from '@/lib/clients/action'
import 'server-only'
import z from 'zod'

const GetAddOnInfoSchema = z.object({
  teamId: z.uuid(),
})

export const getAddOnInfo = authActionClient
  .metadata({ serverFunctionName: 'getAddOnInfo' })
  .inputSchema(GetAddOnInfoSchema)
  .action(async () => {
    return { maxAddons: 0, currentAddons: 0, pricePerAddon: 0 }
  })
