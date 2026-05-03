/**
 * This test builds a basic sandbox template using the E2B SDK,
 * useful for development and testing of template building features in the dashboard.
 */

import { Template } from 'e2b'
import { describe, expect, it } from 'vitest'

const l = console

const { TEST_E2B_DOMAIN, TEST_E2B_API_KEY } = import.meta.env

if (!TEST_E2B_DOMAIN || !TEST_E2B_API_KEY) {
  throw new Error(
    'Missing environment variables: TEST_E2B_DOMAIN and/or TEST_E2B_API_KEY'
  )
}

const BUILD_TIMEOUT_MS = 5 * 60 * 1000

describe('E2B Template build test', () => {
  it(
    'builds a basic template with Node.js',
    { timeout: BUILD_TIMEOUT_MS },
    async () => {
      const templateName = `test-template-${Date.now()}`

      l.info('test:starting_template_build', {
        templateName,
        startTime: new Date().toISOString(),
      })

      const template = Template()
        .skipCache()
        .fromNodeImage('lts')
        .setWorkdir('/app')
        .runCmd('echo "Hello from template build"')
        .setStartCmd('node --version', 'node --version')

      const buildInfo = await Template.build(template, {
        alias: templateName,
        apiKey: TEST_E2B_API_KEY,
        domain: TEST_E2B_DOMAIN,
        onBuildLogs: (log) => {
          l.info('test:build_log', {
            level: log.level,
            message: log.message,
          })
        },
      })

      l.info('test:template_build_completed', {
        templateId: buildInfo.templateId,
        buildId: buildInfo.buildId,
        alias: buildInfo.alias,
        endTime: new Date().toISOString(),
      })

      expect(buildInfo.templateId).toBeDefined()
      expect(buildInfo.buildId).toBeDefined()
    }
  )
})
