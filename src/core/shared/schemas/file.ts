import { z } from 'zod'

const fileSchema = z.object({
  name: z.string(),
  type: z.string(),
  base64: z.string(),
})

export { fileSchema }
