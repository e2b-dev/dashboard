import { expect, test } from '@playwright/test'

test('preview base url is configured for e2e runs', async () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL

  expect(baseURL).toBeTruthy()
  expect(new URL(baseURL as string).protocol).toBe('https:')
})
