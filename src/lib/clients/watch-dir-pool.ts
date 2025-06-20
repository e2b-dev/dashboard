import 'server-cli-only'

import { WatchHandle, FilesystemEvent } from 'e2b'
import { SandboxPool } from './sandbox-pool'

// Grace period in milliseconds before cleaning up unused watch handles
const GRACE_MS = 5_000

interface Entry {
  // Promise that resolves to the watch handle once created
  promise: Promise<WatchHandle>
  // The actual watch handle once available
  handle?: WatchHandle
  // Set of callback functions from all consumers watching this directory
  consumers: Set<(e: FilesystemEvent) => void>
  // Reference count of active consumers
  ref: number
  // Timer for cleanup when ref count reaches 0
  timer?: ReturnType<typeof setTimeout>
}

// ---------------------------------------------
// Global singleton (per Node)
// ---------------------------------------------
// eslint-disable-next-line no-var
declare global {
  // `var` is required for global augmentation – suppressed for eslint
  // eslint-disable-next-line no-var
  var __WATCH_POOL: Map<string, Entry> | undefined
}

const POOL: Map<string, Entry> = (globalThis.__WATCH_POOL ??= new Map<
  string,
  Entry
>())

function makeKey(sandboxId: string, dir: string) {
  return `${sandboxId}:${dir}`
}

export class WatchDirPool {
  /**
   * Acquire (or create) a shared WatchHandle. Multiple callers are
   * fanned-out via an internal consumer list—no mutation of the SDK types.
   */
  static async acquire(
    sandboxId: string,
    dir: string,
    onEvent: (ev: FilesystemEvent) => void,
    sandboxOpts: Parameters<typeof SandboxPool.acquire>[1]
  ): Promise<WatchHandle> {
    const key = makeKey(sandboxId, dir)
    let entry = POOL.get(key)

    if (entry) {
      entry.ref += 1
      entry.consumers.add(onEvent)
      clearTimeout(entry.timer)
    } else {
      entry = {
        ref: 1,
        consumers: new Set([onEvent as (ev: FilesystemEvent) => void]),
        promise: (async () => {
          const sbx = await SandboxPool.acquire(sandboxId, sandboxOpts)
          const handle = await sbx.files.watchDir(
            dir,
            (ev) => entry!.consumers.forEach((fn) => fn(ev)),
            { recursive: true }
          )
          entry!.handle = handle
          return handle
        })(),
      }
      POOL.set(key, entry)
    }

    return entry.promise
  }

  /**
   * Release one reference. When the last reference is gone the underlying
   * stream is closed after GRACE_MS.
   */
  static async release(
    sandboxId: string,
    dir: string,
    onEvent: (ev: FilesystemEvent) => void
  ): Promise<void> {
    const key = makeKey(sandboxId, dir)
    const entry = POOL.get(key)
    if (!entry) return

    entry.ref = Math.max(0, entry.ref - 1)
    entry.consumers.delete(onEvent)

    if (entry.ref === 0 && !entry.timer) {
      entry.timer = setTimeout(async () => {
        if (entry.ref === 0) {
          try {
            await entry.handle?.stop()
          } finally {
            POOL.delete(key)
          }
        }
      }, GRACE_MS)
    }
  }
}
