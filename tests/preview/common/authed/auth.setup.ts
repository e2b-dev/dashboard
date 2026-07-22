import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const mode = process.env.PLAYWRIGHT_MODE === 'pr' ? 'pr' : 'dev'
const authStatePath = resolve(`.playwright/.auth/${mode}-user.json`)

test('sign in via the api key form and persist auth state', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(60_000)

  const apiKey = process.env.TEST_API_KEY

  expect(apiKey, 'TEST_API_KEY must be set').toBeTruthy()

  await page.goto('/')

  const keyInput = page.locator('input[name="apiKey"]')
  await expect(keyInput).toBeVisible({ timeout: 15_000 })
  await keyInput.fill(apiKey as string)

  await Promise.all([
    page.waitForURL(`${baseURL}/sandboxes**`, { timeout: 30_000 }),
    page.getByRole('button', { name: 'Continue' }).click(),
  ])

  mkdirSync(dirname(authStatePath), { recursive: true })
  await context.storageState({ path: authStatePath })
})
