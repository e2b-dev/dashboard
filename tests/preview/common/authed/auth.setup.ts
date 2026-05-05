import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const mode = process.env.PLAYWRIGHT_MODE === 'pr' ? 'pr' : 'dev'
const authStatePath = resolve(`.playwright/.auth/${mode}-user.json`)

test('sign in with email and persist auth state', async ({ page, context }) => {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  expect(email).toBeTruthy()
  expect(password).toBeTruthy()

  await page.goto('/sign-in')
  await page.getByLabel('E-Mail').fill(email as string)
  await page.getByLabel('Password').fill(password as string)

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/sign-in')),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ])

  mkdirSync(dirname(authStatePath), { recursive: true })
  await context.storageState({ path: authStatePath })
})
