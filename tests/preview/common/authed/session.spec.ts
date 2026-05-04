import { expect, test } from '@playwright/test'

test('reuses authenticated cookies from setup', async ({ context }) => {
  const cookies = await context.cookies()

  expect(cookies.length).toBeGreaterThan(0)
})
