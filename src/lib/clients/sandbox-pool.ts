import 'server-cli-only'

import { Sandbox, type SandboxOpts } from 'e2b'
import { VERBOSE } from '@/configs/flags'
import { logDebug } from './logger'

/**
 * How long we keep the connection alive after the last consumer released it.
 * A short grace period avoids connect/disconnect thrashing when the browser
 * refreshes or multiple API calls arrive in quick succession.
 */
const GRACE_MS = 10_000

interface Entry {
  /** Pending or resolved connect promise */
  promise: Promise<Sandbox>
  /** Resolved sandbox instance (set after promise fulfils) */
  sandbox?: Sandbox
  /** Number of active users of this connection */
  ref: number
  /** Handle for delayed close */
  timer?: ReturnType<typeof setTimeout>
}

// ---------------------------------------------
// Global singleton (per Node)
// ---------------------------------------------
// eslint-disable-next-line no-var
declare global {
  // `var` is required for global augmentation – suppressed for eslint
  // eslint-disable-next-line no-var
  var __SBX_POOL: Map<string, Entry> | undefined
}

const POOL: Map<string, Entry> = (globalThis.__SBX_POOL ??= new Map<
  string,
  Entry
>())

export class SandboxPool {
  /**
   * Acquire (or create) a shared sandbox connection for `sandboxId`.
   * Each caller MUST call `release()` when finished.
   */
  static async acquire<T extends Sandbox = Sandbox>(
    sandboxId: string,
    opts: SandboxOpts
  ): Promise<T> {
    let entry = POOL.get(sandboxId)

    if (entry) {
      entry.ref += 1
      clearTimeout(entry.timer)
      if (VERBOSE)
        logDebug('SandboxPool.acquire reuse', sandboxId, 'refs', entry.ref)
    } else {
      if (VERBOSE) logDebug('SandboxPool.acquire connect', sandboxId)
      const promise = Sandbox.connect(sandboxId, opts) as Promise<Sandbox>
      entry = { promise, ref: 1 }
      POOL.set(sandboxId, entry)

      // Cache resolved instance, drop entry if connect fails
      promise
        .then((sbx) => {
          entry!.sandbox = sbx
          if (VERBOSE) logDebug('SandboxPool connected', sandboxId)
        })
        .catch((err) => {
          if (VERBOSE) logDebug('SandboxPool connect FAILED', sandboxId, err)
          POOL.delete(sandboxId)
        })
    }

    if (VERBOSE) logDebug('SandboxPool.acquire return', sandboxId, 'promise')
    return entry.promise as Promise<T>
  }

  /**
   * Release one reference obtained via `acquire()`. The connection is closed
   * after `GRACE_MS` when no other consumers remain.
   */
  static async release(sandboxId: string): Promise<void> {
    const entry = POOL.get(sandboxId)
    if (!entry) return

    entry.ref = Math.max(0, entry.ref - 1)

    if (VERBOSE) logDebug('SandboxPool.release', sandboxId, 'refs', entry.ref)

    if (entry.ref === 0 && !entry.timer) {
      if (VERBOSE)
        logDebug('SandboxPool schedule close', sandboxId, `in ${GRACE_MS}ms`)
      entry.timer = setTimeout(async () => {
        if (entry.ref === 0) {
          if (VERBOSE) logDebug('SandboxPool closing', sandboxId)
          try {
            const closable = entry.sandbox as unknown as {
              close?: () => Promise<void>
              dispose?: () => Promise<void>
            }
            if (closable?.close) await closable.close()
            else if (closable?.dispose) await closable.dispose()
          } finally {
            POOL.delete(sandboxId)
            if (VERBOSE) logDebug('SandboxPool closed', sandboxId)
          }
        }
      }, GRACE_MS)
    }
  }
}
