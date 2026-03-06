/**
 * Triggers every sandbox lifecycle webhook event using a single sandbox.
 * Useful for development/testing of event-driven dashboard features.
 *
 * Events triggered (in order):
 *   1. sandbox.lifecycle.created      — Sandbox.create()
 *   2. sandbox.lifecycle.updated      — sandbox.setTimeout()
 *   3. sandbox.lifecycle.paused       — sandbox.betaPause()
 *   4. sandbox.lifecycle.resumed      — Sandbox.connect() on paused sandbox
 *   5. sandbox.lifecycle.checkpointed — sandbox.createSnapshot()
 *   6. sandbox.lifecycle.killed       — sandbox.kill()
 *
 * Requires e2b@>=2.13.0 for createSnapshot support.
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

const SANDBOX_INITIAL_TIMEOUT_MS = 5 * 60 * 1_000
const UPDATED_TIMEOUT_MS = 3 * 60 * 1_000

const CREATE_SETTLE_MS = 30_000
const PAUSE_SETTLE_MS = 10_000
const RESUME_SETTLE_MS = 10_000
const SNAPSHOT_SETTLE_MS = 10_000
const EVENTS_SETTLE_MS = 5_000

const TEST_TIMEOUT_MS = 3 * 60 * 1_000

// --- All lifecycle event types from the webhook docs ---

const ALL_LIFECYCLE_EVENTS = [
  'sandbox.lifecycle.created',
  'sandbox.lifecycle.updated',
  'sandbox.lifecycle.paused',
  'sandbox.lifecycle.resumed',
  'sandbox.lifecycle.checkpointed',
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

describe('E2B Sandbox lifecycle events', () => {
  it(
    'triggers all webhook event types with a single sandbox',
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const testId = `events-test-${Date.now()}`

      // 1. sandbox.lifecycle.created
      l.info('step:create', { template: TEMPLATE, testId })
      const sandbox = await Sandbox.create(TEMPLATE, {
        ...sdkOpts,
        timeoutMs: SANDBOX_INITIAL_TIMEOUT_MS,
        metadata: { testId },
      })
      const sandboxId = sandbox.sandboxId
      l.info('step:created', { sandboxId })

      await sleep(CREATE_SETTLE_MS)

      try {
        // 2. sandbox.lifecycle.updated
        l.info('step:set_timeout', { timeoutMs: UPDATED_TIMEOUT_MS })
        await sandbox.setTimeout(UPDATED_TIMEOUT_MS)
        l.info('step:timeout_updated')

        // 3. sandbox.lifecycle.paused
        l.info('step:pause')
        await sandbox.pause({
          ...sdkOpts,
        })
        l.info('step:paused', { settleMs: PAUSE_SETTLE_MS })
        await sleep(PAUSE_SETTLE_MS)

        // 4. sandbox.lifecycle.resumed
        l.info('step:resume')
        const resumed = await Sandbox.connect(sandboxId, {
          ...sdkOpts,
          timeoutMs: SANDBOX_INITIAL_TIMEOUT_MS,
        })
        l.info('step:resumed', { settleMs: RESUME_SETTLE_MS })
        await sleep(RESUME_SETTLE_MS)

        // 5. sandbox.lifecycle.checkpointed
        l.info('step:snapshot')
        const snapshot = await resumed.createSnapshot()
        l.info('step:snapshot_created', {
          snapshotId: snapshot.snapshotId,
          settleMs: SNAPSHOT_SETTLE_MS,
        })
        await sleep(SNAPSHOT_SETTLE_MS)

        await Sandbox.deleteSnapshot(snapshot.snapshotId, sdkOpts)
        l.info('step:snapshot_deleted')

        // 6. sandbox.lifecycle.killed
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

      // wait for events to settle in the backend
      await sleep(EVENTS_SETTLE_MS)

      // verify all event types were triggered
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

      for (const expectedType of ALL_LIFECYCLE_EVENTS) {
        expect(
          triggeredTypes.has(expectedType),
          `Missing event: "${expectedType}"`
        ).toBe(true)
      }
    }
  )
})
