import { defineConfig, devices } from '@playwright/test'

const mode = process.env.PLAYWRIGHT_MODE === 'pr' ? 'pr' : 'dev'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const authStatePath = `.playwright/.auth/${mode}-user.json`

const sharedUse = {
  baseURL,
  trace: 'retain-on-failure' as const,
  screenshot: 'only-on-failure' as const,
  video: 'on-first-retry' as const,
  extraHTTPHeaders: bypassSecret
    ? { 'x-vercel-protection-bypass': bypassSecret }
    : undefined,
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: sharedUse,
  projects: [
    {
      name: `${mode}-public`,
      testMatch: [`common/public/**/*.spec.ts`, `${mode}/**/*.spec.ts`],
      testIgnore: ['**/authed/**'],
      use: {
        ...devices['Desktop Chrome'],
        ...sharedUse,
      },
    },
    {
      name: `${mode}-auth-setup`,
      testMatch: ['common/authed/auth.setup.ts'],
      use: {
        ...devices['Desktop Chrome'],
        ...sharedUse,
      },
    },
    {
      name: `${mode}-authed`,
      testMatch: ['common/authed/**/*.spec.ts', `${mode}/authed/**/*.spec.ts`],
      testIgnore: ['**/auth.setup.ts'],
      dependencies: [`${mode}-auth-setup`],
      use: {
        ...devices['Desktop Chrome'],
        ...sharedUse,
        storageState: authStatePath,
      },
    },
  ],
})
