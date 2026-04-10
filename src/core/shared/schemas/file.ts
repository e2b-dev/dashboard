import { z } from 'zod'

const FileSchema = z.object({
  name: z.string(),
  type: z.string(),
  base64: z.string(),
})

export { FileSchema }
