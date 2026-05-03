import { expect, test } from '@playwright/test'

test('base url is valid for current mode', async () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
  const parsedBaseURL = new URL(baseURL)

  expect(baseURL).toBeTruthy()

  if (
    parsedBaseURL.hostname === 'localhost' ||
    parsedBaseURL.hostname === '127.0.0.1'
  ) {
    expect(parsedBaseURL.protocol).toBe('http:')
    return
  }

  expect(parsedBaseURL.protocol).toBe('https:')
})
