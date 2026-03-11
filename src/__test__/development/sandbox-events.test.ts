/**
 * Triggers sandbox lifecycle events with variable resource stress.
 * Useful for development/testing of event-driven dashboard features.
 *
 * Timeline (~6 minutes):
 *   1. Create sandbox, install stress-ng
 *   2. Ramp-up: light CPU + RAM (15s)
 *   3. Idle gap (5s)
 *   4. Burst: heavy CPU + moderate RAM + disk writes (20s)
 *   5. Idle gap (5s)
 *   6. Disk-heavy: large file writes via dd + fallocate (15s)
 *   7. Idle gap (5s)
 *   8. Mixed: moderate CPU + heavy RAM + disk I/O (20s)
 *   9. Pause sandbox
 *  10. Wait ~30s (paused gap)
 *  11. Resume sandbox
 *  12. Spike: max CPU + RAM + disk (15s)
 *  13. Taper: light CPU only (10s)
 *  14. Idle gap (5s)
 *  15. Sustained: moderate all resources (25s)
 *  16. Cool down (10s)
 *  17. Kill sandbox
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

const { TEST_E2B_DOMAIN, TEST_E2B_API_KEY, TEST_E2B_TEMPLATE } =
  import.meta.env

if (!TEST_E2B_DOMAIN || !TEST_E2B_API_KEY) {
  throw new Error(
    'Missing environment variables: TEST_E2B_DOMAIN and/or TEST_E2B_API_KEY'
  )
}

const TEMPLATE = TEST_E2B_TEMPLATE || 'base'

// --- Tunable timing constants ---

const SANDBOX_TIMEOUT_MS = 10 * 60 * 1_000
const INSTALL_SETTLE_MS = 5_000
const PAUSE_DURATION_MS = 30_000
const COOLDOWN_MS = 10_000
const EVENTS_SETTLE_MS = 5_000
const IDLE_GAP_MS = 5_000

const TEST_TIMEOUT_MS = 10 * 60 * 1_000

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
    cpuWorkers?: number
    cpuLoad?: number
    vmWorkers?: number
    vmBytes?: string
    hddWorkers?: number
    hddBytes?: string
    durationS: number
  }
) {
  const args = ['stress-ng']

  if (options.cpuWorkers) {
    args.push(`--cpu ${options.cpuWorkers}`)
    if (options.cpuLoad) {
      args.push(`--cpu-load ${options.cpuLoad}`)
    }
  }
  if (options.vmWorkers) {
    args.push(`--vm ${options.vmWorkers}`)
    if (options.vmBytes) {
      args.push(`--vm-bytes ${options.vmBytes}`)
    }
  }
  if (options.hddWorkers) {
    args.push(`--hdd ${options.hddWorkers}`)
    if (options.hddBytes) {
      args.push(`--hdd-bytes ${options.hddBytes}`)
    }
  }

  args.push(`--timeout ${options.durationS}s`, '--metrics-brief')
  const cmd = args.join(' ')

  l.info(`step:stress_start:${label}`, { cmd, durationS: options.durationS })
  const result = await sandbox.commands.run(cmd, {
    timeoutMs: (options.durationS + 30) * 1_000,
  })
  l.info(`step:stress_done:${label}`, {
    exitCode: result.exitCode,
    stderr: result.stderr.slice(-500),
  })
}

async function runDiskStress(sandbox: Sandbox, label: string) {
  const commands = [
    // Write a 256MB file with dd (sequential I/O)
    'dd if=/dev/urandom of=/tmp/stress_file_1 bs=1M count=256 conv=fdatasync 2>&1',
    // Allocate a 512MB sparse file then fill it
    'fallocate -l 512M /tmp/stress_file_2 && dd if=/dev/urandom of=/tmp/stress_file_2 bs=1M count=512 conv=notrunc,fdatasync 2>&1',
    // Write many small files (simulates log/temp file churn)
    'for i in $(seq 1 200); do dd if=/dev/urandom of=/tmp/stress_small_$i bs=64K count=16 2>/dev/null; done',
    // Cleanup
    'rm -f /tmp/stress_file_* /tmp/stress_small_*',
  ].join(' && ')

  l.info(`step:disk_stress_start:${label}`)
  const result = await sandbox.commands.run(commands, { timeoutMs: 120_000 })
  l.info(`step:disk_stress_done:${label}`, {
    exitCode: result.exitCode,
    stderr: result.stderr.slice(-500),
  })
}

describe('E2B Sandbox lifecycle events with resource stress', () => {
  it(
    'creates variable resource usage with a pause gap',
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

        // --- Pre-pause phases: variable load pattern ---

        // Phase 1: Ramp-up — light CPU + small RAM
        await runStress(sandbox, 'ramp-up', {
          cpuWorkers: 1,
          cpuLoad: 30,
          vmWorkers: 1,
          vmBytes: '32M',
          durationS: 15,
        })
        await sleep(IDLE_GAP_MS)

        // Phase 2: CPU burst — heavy CPU + moderate RAM + disk
        await runStress(sandbox, 'cpu-burst', {
          cpuWorkers: 2,
          cpuLoad: 90,
          vmWorkers: 1,
          vmBytes: '96M',
          hddWorkers: 1,
          hddBytes: '64M',
          durationS: 20,
        })
        await sleep(IDLE_GAP_MS)

        // Phase 3: Disk-heavy — large sequential + random writes
        await runDiskStress(sandbox, 'disk-heavy')
        await sleep(IDLE_GAP_MS)

        // Phase 4: Mixed — moderate CPU + heavy RAM + disk I/O
        await runStress(sandbox, 'mixed', {
          cpuWorkers: 1,
          cpuLoad: 50,
          vmWorkers: 2,
          vmBytes: '128M',
          hddWorkers: 2,
          hddBytes: '128M',
          durationS: 20,
        })

        // --- Pause / Resume ---

        l.info('step:pause')
        await sandbox.pause({ ...sdkOpts })
        l.info('step:paused', { durationMs: PAUSE_DURATION_MS })
        await sleep(PAUSE_DURATION_MS)

        l.info('step:resume')
        const resumed = await Sandbox.connect(sandboxId, {
          ...sdkOpts,
          timeoutMs: SANDBOX_TIMEOUT_MS,
        })
        l.info('step:resumed')

        // --- Post-resume phases: different pattern ---

        // Phase 5: Spike — max everything
        await runStress(resumed, 'spike', {
          cpuWorkers: 2,
          cpuLoad: 95,
          vmWorkers: 2,
          vmBytes: '192M',
          hddWorkers: 2,
          hddBytes: '256M',
          durationS: 15,
        })

        // Phase 6: Taper — light CPU only (visible drop)
        await runStress(resumed, 'taper', {
          cpuWorkers: 1,
          cpuLoad: 20,
          durationS: 10,
        })
        await sleep(IDLE_GAP_MS)

        // Phase 7: Sustained — moderate across all resources
        await runStress(resumed, 'sustained', {
          cpuWorkers: 1,
          cpuLoad: 60,
          vmWorkers: 1,
          vmBytes: '80M',
          hddWorkers: 1,
          hddBytes: '96M',
          durationS: 25,
        })

        // Cooldown
        l.info('step:cooldown', { durationMs: COOLDOWN_MS })
        await sleep(COOLDOWN_MS)

        // Kill sandbox
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
