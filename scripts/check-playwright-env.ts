import { z } from 'zod'

const playwrightEnvSchema = z.object({
  PLAYWRIGHT_BASE_URL: z.url(),
  TEST_USER_EMAIL: z.email(),
  TEST_USER_PASSWORD: z.string().min(8),
})

const parsed = playwrightEnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Playwright environment is not properly configured')
  console.error(z.prettifyError(parsed.error))
  process.exit(1)
}

if (
  process.env.CI === 'true' &&
  process.env.GITHUB_ACTIONS === 'true' &&
  !process.env.VERCEL_AUTOMATION_BYPASS_SECRET
) {
  console.error('❌ Missing VERCEL_AUTOMATION_BYPASS_SECRET for CI preview runs')
  process.exit(1)
}

console.log('✅ Playwright environment is properly configured')
