import { z } from 'zod'

const TimezoneSchema = z
  .string()
  .min(1)
  .refine(
    (timezone) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone })
        return true
      } catch {
        return false
      }
    },
    { message: 'Invalid timezone' }
  )
  .brand<'Timezone'>()

type Timezone = z.infer<typeof TimezoneSchema>

const UTC_TIMEZONE = TimezoneSchema.parse('UTC')

export { TimezoneSchema, UTC_TIMEZONE, type Timezone }
