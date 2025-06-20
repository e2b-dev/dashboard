import 'server-cli-only'

import { Sandbox, type SandboxOpts } from 'e2b'

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
    } else {
      const promise = Sandbox.connect(sandboxId, opts) as Promise<Sandbox>
      entry = { promise, ref: 1 }
      POOL.set(sandboxId, entry)

      // Cache resolved instance, drop entry if connect fails
      promise
        .then((sbx) => {
          entry!.sandbox = sbx
        })
        .catch(() => {
          POOL.delete(sandboxId)
        })
    }

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

    if (entry.ref === 0 && !entry.timer) {
      entry.timer = setTimeout(async () => {
        if (entry.ref === 0) {
          try {
            const closable = entry.sandbox as unknown as {
              close?: () => Promise<void>
              dispose?: () => Promise<void>
            }
            if (closable?.close) await closable.close()
            else if (closable?.dispose) await closable.dispose()
          } finally {
            POOL.delete(sandboxId)
          }
        }
      }, GRACE_MS)
    }
  }
}
