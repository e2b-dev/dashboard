import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const mode = process.env.PLAYWRIGHT_MODE === 'pr' ? 'pr' : 'dev'
const authStatePath = resolve(`.playwright/.auth/${mode}-user.json`)

test('sign in via Ory hosted UI and persist auth state', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(60_000)

  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  expect(email, 'TEST_USER_EMAIL must be set').toBeTruthy()
  expect(password, 'TEST_USER_PASSWORD must be set').toBeTruthy()

  // /sign-in middleware redirects through /api/auth/oauth-start → Hydra →
  // Kratos hosted UI on a different origin; Playwright follows the chain.
  await page.goto('/sign-in')

  const identifier = page.locator('input[name="identifier"]')
  await expect(identifier).toBeVisible({ timeout: 15_000 })
  await identifier.fill(email as string)

  const identifierFirstSubmit = page.locator(
    'button[name="method"][value="identifier_first"]'
  )
  if (await identifierFirstSubmit.isVisible().catch(() => false)) {
    await identifierFirstSubmit.click()
  }

  const passwordInput = page.locator('input[name="password"]')
  await expect(passwordInput).toBeVisible({ timeout: 15_000 })
  await passwordInput.fill(password as string)

  await Promise.all([
    page.waitForURL(`${baseURL}/dashboard**`, { timeout: 30_000 }),
    page.locator('button[name="method"][value="password"]').click(),
  ])

  mkdirSync(dirname(authStatePath), { recursive: true })
  await context.storageState({ path: authStatePath })
})
