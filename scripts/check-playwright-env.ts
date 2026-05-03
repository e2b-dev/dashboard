import { z } from 'zod'

const mode = process.env.PLAYWRIGHT_MODE === 'pr' ? 'pr' : 'dev'

const devSchema = z.object({
  PLAYWRIGHT_BASE_URL: z.url().optional(),
  TEST_USER_EMAIL: z.email(),
  TEST_USER_PASSWORD: z.string().min(8),
})

const prSchema = z.object({
  PLAYWRIGHT_BASE_URL: z.url(),
  TEST_USER_EMAIL: z.email(),
  TEST_USER_PASSWORD: z.string().min(8),
})

const schema = mode === 'pr' ? prSchema : devSchema
const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error(`❌ Playwright ${mode} environment is not properly configured`)
  console.error(z.prettifyError(parsed.error))
  process.exit(1)
}

if (
  mode === 'pr' &&
  process.env.CI === 'true' &&
  process.env.GITHUB_ACTIONS === 'true' &&
  !process.env.VERCEL_AUTOMATION_BYPASS_SECRET
) {
  console.error(
    '❌ Missing VERCEL_AUTOMATION_BYPASS_SECRET for CI preview runs'
  )
  process.exit(1)
}

console.log(`✅ Playwright ${mode} environment is properly configured`)
