/**
 * This test simulates sandbox traffic over time by spawning sandboxes at random intervals,
 * which is useful when working in the dashboard and need traffic data for development
 * and testing of dashboard features.
 */

import { Sandbox } from 'e2b'
import { describe, it } from 'vitest'

const l = console

// Ensure required environment variables exist
const { TEST_E2B_DOMAIN, TEST_E2B_API_KEY, TEST_E2B_TEMPLATE } = import.meta.env

if (!TEST_E2B_DOMAIN || !TEST_E2B_API_KEY) {
  throw new Error(
    'Missing environment variables: TEST_E2B_DOMAIN and/or TEST_E2B_API_KEY'
  )
}

const TEMPLATE = TEST_E2B_TEMPLATE || 'base'

const TEST_DURATION_MINUTES = 15
const SPAWN_PROBABILITY = 0.4
const MAX_CONCURRENT_SANDBOXES = 30
const SBX_TIMEOUT_MS = 30 * 1000
const PROGRESS_INTERVAL = 10 * 1000

interface TrafficTestConfig {
  testDurationMinutes: number
  spawnProbability: number
  maxConcurrentSandboxes: number
  sandboxTimeoutMs: number
  template: string
}

async function runTrafficSimulation(config: TrafficTestConfig) {
  const {
    testDurationMinutes,
    spawnProbability,
    maxConcurrentSandboxes,
    sandboxTimeoutMs,
    template,
  } = config

  const testId = `traffic-test-${Date.now()}`
  const testEndTime = Date.now() + testDurationMinutes * 60 * 1000

  const activeSandboxes = new Set<string>()

  let totalSpawned = 0
  let totalClosed = 0
  let spawnErrors = 0
  let maxConcurrent = 0

  const progressInterval = setInterval(() => {
    const currentCount = activeSandboxes.size
    maxConcurrent = Math.max(maxConcurrent, currentCount)

    l.info('test:progress', {
      testId,
      elapsedMinutes: (
        (Date.now() - (testEndTime - testDurationMinutes * 60 * 1000)) /
        60000
      ).toFixed(1),
      remainingMinutes: ((testEndTime - Date.now()) / 60000).toFixed(1),
      currentSandboxes: currentCount,
      maxConcurrent,
      totalSpawned,
      totalClosed,
      spawnErrors,
    })
  }, PROGRESS_INTERVAL)

  try {
    while (Date.now() < testEndTime) {
      if (
        Math.random() < spawnProbability &&
        activeSandboxes.size < maxConcurrentSandboxes
      ) {
        try {
          const sandbox = await Sandbox.create(template, {
            domain: TEST_E2B_DOMAIN,
            apiKey: TEST_E2B_API_KEY,
            timeoutMs: sandboxTimeoutMs,
            metadata: {
              testId,
              spawnTime: new Date().toISOString(),
            },
          })

          const sandboxId = sandbox.sandboxId
          activeSandboxes.add(sandboxId)
          totalSpawned++

          l.info('test:sandbox_spawned', {
            id: sandboxId,
            current: activeSandboxes.size,
            total: totalSpawned,
          })

          setTimeout(() => {
            if (activeSandboxes.has(sandboxId)) {
              activeSandboxes.delete(sandboxId)
              totalClosed++
              l.info('test:sandbox_closed', {
                id: sandboxId,
                reason: 'auto_timeout_or_closed',
              })
            }
          }, sandboxTimeoutMs)
        } catch (err) {
          spawnErrors++
          l.error('test:sandbox_spawn_error', { error: err })
        }
      }

      await new Promise((res) => {
        setTimeout(res, 1000)
      })
    }

    l.info('test:test_completed', { remainingSandboxes: activeSandboxes.size })

    return {
      testId,
      testDurationMinutes,
      totalSpawned,
      totalClosed,
      spawnErrors,
      maxConcurrent,
      template,
    }
  } finally {
    clearInterval(progressInterval)
  }
}

describe('E2B Sandbox traffic simulator', () => {
  it(
    `simulates traffic for ${TEST_DURATION_MINUTES} minutes with spawn probability ${SPAWN_PROBABILITY}`,
    { timeout: (TEST_DURATION_MINUTES + 1) * 60 * 1000 },
    async () => {
      const testConfig: TrafficTestConfig = {
        testDurationMinutes: TEST_DURATION_MINUTES,
        spawnProbability: SPAWN_PROBABILITY,
        maxConcurrentSandboxes: MAX_CONCURRENT_SANDBOXES,
        sandboxTimeoutMs: SBX_TIMEOUT_MS,
        template: TEMPLATE,
      }

      l.info('test:starting_traffic_simulation', {
        ...testConfig,
        testStartTime: new Date().toISOString(),
      })

      const results = await runTrafficSimulation(testConfig)

      l.info('test:traffic_simulation_completed', {
        ...results,
        testEndTime: new Date().toISOString(),
      })
    }
  )
})
