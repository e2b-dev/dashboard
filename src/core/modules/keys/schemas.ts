import { z } from 'zod'

const API_KEY_NAME_MAX_LENGTH = 50

const CreateApiKeySchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .min(1, 'Name cannot be empty')
    .max(API_KEY_NAME_MAX_LENGTH, {
      message: `Name cannot be longer than ${API_KEY_NAME_MAX_LENGTH} characters`,
    })
    .trim(),
})

export { CreateApiKeySchema }
