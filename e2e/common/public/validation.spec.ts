import { expect, test } from '@playwright/test'

test('base url is valid for current mode', async ({ page }, testInfo) => {
  void page
  const resolvedBaseURL = testInfo.project.use.baseURL
  const expectedBaseURL =
    process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

  expect(resolvedBaseURL).toBeTruthy()
  expect(resolvedBaseURL).toBe(expectedBaseURL)

  const parsedBaseURL = new URL(resolvedBaseURL as string)

  if (
    parsedBaseURL.hostname === 'localhost' ||
    parsedBaseURL.hostname === '127.0.0.1'
  ) {
    expect(parsedBaseURL.protocol).toBe('http:')
    return
  }

  expect(parsedBaseURL.protocol).toBe('https:')
})
