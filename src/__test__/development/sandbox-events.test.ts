/**
 * Triggers sandbox lifecycle events with realistic resource stress.
 * Useful for development/testing of event-driven dashboard features.
 *
 * Timeline (~5 minutes):
 *   1. Create sandbox, install stress-ng
 *   2. Run CPU + RAM + disk stress for ~60s
 *   3. Pause sandbox
 *   4. Wait ~30s (paused gap)
 *   5. Resume sandbox
 *   6. Run heavier stress for ~90s
 *   7. Cool down ~30s (idle)
 *   8. Kill sandbox
 *
 * Events triggered:
 *   - sandbox.lifecycle.created
 *   - sandbox.lifecycle.updated
 *   - sandbox.lifecycle.paused
 *   - sandbox.lifecycle.resumed
 *   - sandbox.lifecycle.killed
 */

import { Sandbox } from 'e2b'
import { describe, expect, it } from 'vitest'

const l = console

const { TEST_E2B_DOMAIN, TEST_E2B_API_KEY, TEST_E2B_TEMPLATE } = import.meta.env

if (!TEST_E2B_DOMAIN || !TEST_E2B_API_KEY) {
  throw new Error(
    'Missing environment variables: TEST_E2B_DOMAIN and/or TEST_E2B_API_KEY'
  )
}

const TEMPLATE = TEST_E2B_TEMPLATE || 'base'

// --- Tunable timing constants ---

const SANDBOX_TIMEOUT_MS = 10 * 60 * 1_000
const INSTALL_SETTLE_MS = 5_000
const STRESS_PHASE_1_DURATION_S = 60
const PAUSE_DURATION_MS = 30_000
const STRESS_PHASE_2_DURATION_S = 90
const COOLDOWN_MS = 30_000
const EVENTS_SETTLE_MS = 5_000

const TEST_TIMEOUT_MS = 7 * 60 * 1_000

// --- Expected lifecycle event types ---

const EXPECTED_LIFECYCLE_EVENTS = [
  'sandbox.lifecycle.created',
  'sandbox.lifecycle.updated',
  'sandbox.lifecycle.paused',
  'sandbox.lifecycle.resumed',
  'sandbox.lifecycle.killed',
] as const

// ---

const sdkOpts = {
  domain: TEST_E2B_DOMAIN,
  apiKey: TEST_E2B_API_KEY,
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface LifecycleEvent {
  type: string
  id: string
  timestamp: string
}

async function fetchSandboxEvents(
  sandboxId: string
): Promise<LifecycleEvent[]> {
  const url = `https://api.${TEST_E2B_DOMAIN}/events/sandboxes/${sandboxId}?limit=100&orderAsc=true`
  const resp = await fetch(url, {
    headers: { 'X-API-Key': TEST_E2B_API_KEY! },
  })

  if (!resp.ok) {
    l.warn('events:fetch_failed', {
      status: resp.status,
      body: await resp.text().catch(() => ''),
    })
    return []
  }

  return resp.json()
}

async function installStressNg(sandbox: Sandbox) {
  l.info('step:install_stress_ng')
  const result = await sandbox.commands.run(
    'sudo apt-get update -qq && sudo apt-get install -y -qq stress-ng > /dev/null 2>&1',
    { timeoutMs: 60_000 }
  )
  if (result.exitCode !== 0) {
    throw new Error(`stress-ng install failed: ${result.stderr}`)
  }
  l.info('step:stress_ng_installed')
}

async function runStress(
  sandbox: Sandbox,
  label: string,
  options: {
    cpuWorkers: number
    vmWorkers: number
    vmBytes: string
    hddWorkers: number
    hddBytes: string
    durationS: number
  }
) {
  const cmd = [
    'stress-ng',
    `--cpu ${options.cpuWorkers}`,
    `--vm ${options.vmWorkers}`,
    `--vm-bytes ${options.vmBytes}`,
    `--hdd ${options.hddWorkers}`,
    `--hdd-bytes ${options.hddBytes}`,
    `--timeout ${options.durationS}s`,
    '--metrics-brief',
  ].join(' ')

  l.info(`step:stress_start:${label}`, { cmd, durationS: options.durationS })
  const result = await sandbox.commands.run(cmd, {
    timeoutMs: (options.durationS + 30) * 1_000,
  })
  l.info(`step:stress_done:${label}`, {
    exitCode: result.exitCode,
    stderr: result.stderr.slice(-500),
  })
}

describe('E2B Sandbox lifecycle events with resource stress', () => {
  it(
    'creates realistic resource usage with a pause gap',
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const testId = `stress-test-${Date.now()}`

      // 1. Create sandbox
      l.info('step:create', { template: TEMPLATE, testId })
      const sandbox = await Sandbox.create(TEMPLATE, {
        ...sdkOpts,
        timeoutMs: SANDBOX_TIMEOUT_MS,
        metadata: { testId },
      })
      const sandboxId = sandbox.sandboxId
      l.info('step:created', { sandboxId })

      try {
        // 2. Install stress-ng
        await installStressNg(sandbox)
        await sleep(INSTALL_SETTLE_MS)

        // 3. Update timeout
        l.info('step:set_timeout')
        await sandbox.setTimeout(SANDBOX_TIMEOUT_MS)

        // 4. Phase 1: moderate stress (simulates normal workload)
        await runStress(sandbox, 'phase1', {
          cpuWorkers: 1,
          vmWorkers: 1,
          vmBytes: '64M',
          hddWorkers: 1,
          hddBytes: '128M',
          durationS: STRESS_PHASE_1_DURATION_S,
        })

        // 5. Pause sandbox
        l.info('step:pause')
        await sandbox.pause({ ...sdkOpts })
        l.info('step:paused', { durationMs: PAUSE_DURATION_MS })
        await sleep(PAUSE_DURATION_MS)

        // 6. Resume sandbox
        l.info('step:resume')
        const resumed = await Sandbox.connect(sandboxId, {
          ...sdkOpts,
          timeoutMs: SANDBOX_TIMEOUT_MS,
        })
        l.info('step:resumed')

        // 7. Phase 2: heavier stress (simulates burst after resume)
        await runStress(resumed, 'phase2', {
          cpuWorkers: 2,
          vmWorkers: 2,
          vmBytes: '128M',
          hddWorkers: 2,
          hddBytes: '256M',
          durationS: STRESS_PHASE_2_DURATION_S,
        })

        // 8. Cooldown (idle period before kill)
        l.info('step:cooldown', { durationMs: COOLDOWN_MS })
        await sleep(COOLDOWN_MS)

        // 9. Kill sandbox
        l.info('step:kill')
        await resumed.kill()
        l.info('step:killed')
      } catch (err) {
        l.error('step:error', { error: err })
        try {
          await Sandbox.kill(sandboxId, sdkOpts)
        } catch {}
        throw err
      }

      // Wait for events to settle
      await sleep(EVENTS_SETTLE_MS)

      // Verify lifecycle events
      l.info('step:verify_events', { sandboxId })
      const events = await fetchSandboxEvents(sandboxId)
      const triggeredTypes = new Set(events.map((e) => e.type))

      l.info('step:events_summary', {
        total: events.length,
        types: [...triggeredTypes],
        timeline: events.map((e) => ({
          type: e.type,
          timestamp: e.timestamp,
        })),
      })

      for (const expectedType of EXPECTED_LIFECYCLE_EVENTS) {
        expect(
          triggeredTypes.has(expectedType),
          `Missing event: "${expectedType}"`
        ).toBe(true)
      }
    }
  )
})
