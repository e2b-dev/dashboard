import { expect, test } from '@playwright/test'

test('reuses the api key cookie from setup', async ({ context }) => {
  const cookies = await context.cookies()

  expect(cookies.some((cookie) => cookie.name === 'e2b_api_key')).toBe(true)
})
