import 'server-cli-only'

import { WatchHandle, FilesystemEvent } from 'e2b'
import { SandboxPool } from './sandbox-pool'
import { VERBOSE } from '@/configs/flags'
import { logDebug } from './logger'

// Grace period in milliseconds before cleaning up unused watch handles –
// 30 s gives background tabs enough time to reconnect after throttling.
const GRACE_MS = 10_000

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

    if (VERBOSE) logDebug('WatchDirPool.acquire', key)

    if (entry) {
      entry.ref += 1
      entry.consumers.add(onEvent)
      clearTimeout(entry.timer)
      if (VERBOSE) logDebug('WatchDirPool.reuse', key, 'refs', entry.ref)
    } else {
      if (VERBOSE) logDebug('WatchDirPool.createWatcher', key)
      entry = {
        ref: 1,
        consumers: new Set([onEvent as (ev: FilesystemEvent) => void]),
        promise: (async () => {
          const sbx = await SandboxPool.acquire(sandboxId, sandboxOpts)
          if (VERBOSE)
            logDebug('WatchDirPool.connectedToSandbox', sandboxId, 'dir', dir)
          const handle = await sbx.files.watchDir(
            dir,
            (ev) => entry!.consumers.forEach((fn) => fn(ev)),
            { recursive: true }
          )
          entry!.handle = handle
          if (VERBOSE) logDebug('WatchDirPool.watcherReady', key)
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

    if (VERBOSE) logDebug('WatchDirPool.release', key, 'refs', entry.ref)

    if (entry.ref === 0 && !entry.timer) {
      if (VERBOSE)
        logDebug('WatchDirPool.scheduleStop', key, `in ${GRACE_MS}ms`)
      entry.timer = setTimeout(async () => {
        if (entry.ref === 0) {
          if (VERBOSE) logDebug('WatchDirPool.stopping', key)
          try {
            await entry.handle?.stop()
            await SandboxPool.release(sandboxId)
          } finally {
            POOL.delete(key)
            if (VERBOSE) logDebug('WatchDirPool.stopped', key)
          }
        }
      }, GRACE_MS)
    }
  }
}
