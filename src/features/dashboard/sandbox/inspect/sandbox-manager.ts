import {
  FileType,
  type Sandbox,
  type FilesystemEvent,
  type WatchHandle,
  type EntryInfo,
  FilesystemEventType,
} from 'e2b'
import type { FilesystemStore } from './filesystem/store'
import { FilesystemNode } from './filesystem/types'
import { normalizePath, joinPath, getParentPath } from '@/lib/utils/filesystem'
import { determineFileContentState } from '@/lib/utils/filesystem'

export const HANDLED_ERRORS = {
  'signal timed out': 'The operation timed out. Please try again later.',
  'user aborted a request': 'The request was cancelled. Try downloading the file.',
} as const

export class SandboxManager {
  private watchHandle?: WatchHandle
  private readonly rootPath: string
  private store: FilesystemStore
  private sandbox: Sandbox
  private readonly isSandboxSecure: boolean = false

  private static readonly LOAD_DEBOUNCE_MS = 250
  private static readonly READ_DEBOUNCE_MS = 250


  private loadTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private pendingLoads: Map<
    string,
    {
      promise: Promise<void>
      resolve: () => void
      reject: (err: unknown) => void
    }
  > = new Map()

  private readTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private pendingReads: Map<
    string,
    {
      promise: Promise<void>
      resolve: () => void
      reject: (err: unknown) => void
    }
  > = new Map()

  constructor(store: FilesystemStore, sandbox: Sandbox, rootPath: string, isSandboxSecure: boolean) {
    this.store = store
    this.sandbox = sandbox
    this.rootPath = normalizePath(rootPath)
    this.isSandboxSecure = isSandboxSecure

    // immediately start a single recursive watcher at the root
    void this.startRootWatcher()
  }

  private async startRootWatcher(): Promise<void> {
    if (this.watchHandle) return

    try {
      this.watchHandle = await this.sandbox.files.watchDir(
        this.rootPath,
        (event) => this.handleFilesystemEvent(event),
        { recursive: true, timeoutMs: 0 }
      )
    } catch (error) {
      console.error(`Failed to start root watcher on ${this.rootPath}:`, error)
      throw error
    }
  }

  stopWatching(): void {
    if (this.watchHandle) {
      this.watchHandle.stop()
      this.watchHandle = undefined
    }
  }

  private handleFilesystemEvent(event: FilesystemEvent): void {
    const { type, name } = event

    // "name" is relative to the watched root; construct absolute path
    const normalizedPath = normalizePath(joinPath(this.rootPath, name))
    const parentDir = normalizePath(
      joinPath(this.rootPath, getParentPath(name))
    )

    const state = this.store.getState()
    const parentNode = state.getNode(parentDir)

    switch (type) {
      case FilesystemEventType.CREATE:
      case FilesystemEventType.RENAME:
        if (parentNode && state.isLoaded(parentDir)) {
          void this.refreshDirectory(parentDir)
        }
        break

      case FilesystemEventType.REMOVE:
        this.handleRemoveEvent(normalizedPath)
        break

      case FilesystemEventType.WRITE:
        void this.readFile(normalizedPath)
        break

      case FilesystemEventType.CHMOD:
        break

      default:
        console.warn(`Unknown filesystem event type: ${type}`)
        break
    }
  }

  private handleRemoveEvent(removedPath: string): void {
    const state = this.store.getState()
    const node = state.getNode(removedPath)

    if (!node) return

    state.removeNode(removedPath)

    if (node?.type === FileType.FILE) {
      state.resetFileContent(removedPath)
    }
  }

  async loadDirectory(path: string): Promise<void> {
    const normalizedPath = normalizePath(path)

    const node = this.store.getState().getNode(normalizedPath)

    if (node?.type === FileType.FILE) {
      return
    }

    let pending = this.pendingLoads.get(normalizedPath)
    if (!pending) {
      pending = SandboxManager.createDeferred<void>()
      this.pendingLoads.set(normalizedPath, pending)
    }

    const state = this.store.getState()

    const isAlreadyLoading = state.loadingPaths.has(normalizedPath)
    const existingTimer = this.loadTimers.get(normalizedPath)

    if (isAlreadyLoading || existingTimer) {
      if (existingTimer) clearTimeout(existingTimer)

      const timer = setTimeout(async () => {
        this.loadTimers.delete(normalizedPath)
        try {
          await this.loadDirectoryImmediate(normalizedPath)
          pending.resolve()
        } catch (err) {
          pending.reject(err)
        } finally {
          this.pendingLoads.delete(normalizedPath)
        }
      }, SandboxManager.LOAD_DEBOUNCE_MS)

      this.loadTimers.set(normalizedPath, timer)
      return pending.promise
    }

    void this.loadDirectoryImmediate(normalizedPath)
      .then(() => pending.resolve())
      .catch((err) => pending.reject(err))
      .finally(() => this.pendingLoads.delete(normalizedPath))

    return pending.promise
  }

  private async loadDirectoryImmediate(path: string): Promise<void> {
    const normalizedPath = normalizePath(path)
    const state = this.store.getState()
    const node = state.getNode(normalizedPath)

    if (
      !node ||
      node.type !== FileType.DIR ||
      state.loadingPaths.has(normalizedPath)
    )
      return

    state.setLoading(normalizedPath, true)
    state.setError(normalizedPath) // clear any previous errors

    try {
      const entries = await this.sandbox.files.list(normalizedPath)

      const nodes: FilesystemNode[] = entries.map((entry: EntryInfo) => {
        if (entry.type === FileType.DIR) {
          return {
            name: entry.name,
            path: entry.path,
            type: FileType.DIR,
            isExpanded: false,
            isSelected: false,
            children: [],
          }
        } else {
          return {
            name: entry.name,
            path: entry.path,
            type: FileType.FILE,
            isSelected: false,
          }
        }
      })

      state.addNodes(normalizedPath, nodes)

      const newChildrenSet = new Set(nodes.map((n) => normalizePath(n.path)))

      for (const childPath of [...node.children]) {
        if (!newChildrenSet.has(childPath)) {
          state.removeNode(childPath)
        }
      }
    } catch (error) {
      const errorMessage = SandboxManager.pipeError(
        error,
        'Failed to load directory'
      )
      state.setError(normalizedPath, errorMessage)
      console.error(`Failed to load directory ${normalizedPath}:`, error)
    } finally {
      state.setLoading(normalizedPath, false)
      state.setLoaded(normalizedPath, true)
    }
  }

  async refreshDirectory(path: string): Promise<void> {
    const normalizedPath = normalizePath(path)
    const state = this.store.getState()

    const node = state.getNode(normalizedPath)
    if (!node || node.type !== FileType.DIR) return

    await this.loadDirectory(normalizedPath)
  }

  async readFile(path: string): Promise<void> {
    const normalizedPath = normalizePath(path)
    const state = this.store.getState()
    const node = state.getNode(normalizedPath)

    if (!node || node.type !== FileType.FILE) return

    let pending = this.pendingReads.get(normalizedPath)
    if (!pending) {
      pending = SandboxManager.createDeferred<void>()
      this.pendingReads.set(normalizedPath, pending)
    }

    const isAlreadyLoading = state.loadingPaths.has(normalizedPath)
    const existingTimer = this.readTimers.get(normalizedPath)

    if (isAlreadyLoading || existingTimer) {
      if (existingTimer) clearTimeout(existingTimer)

      const timer = setTimeout(async () => {
        this.readTimers.delete(normalizedPath)
        try {
          await this.readFileImmediate(normalizedPath)
          pending.resolve()
        } catch (err) {
          pending.reject(err)
        } finally {
          this.pendingReads.delete(normalizedPath)
        }
      }, SandboxManager.READ_DEBOUNCE_MS)

      this.readTimers.set(normalizedPath, timer)
      return pending.promise
    }

    void this.readFileImmediate(normalizedPath)
      .then(() => pending.resolve())
      .catch((err) => pending.reject(err))
      .finally(() => this.pendingReads.delete(normalizedPath))

    return pending.promise
  }

  private async readFileImmediate(path: string): Promise<void> {
    const normalizedPath = normalizePath(path)
    const state = this.store.getState()
    const node = state.getNode(normalizedPath)

    if (!node || node.type !== FileType.FILE) return

    try {
      state.setLoading(normalizedPath, true)

      const blob = await this.sandbox.files.read(normalizedPath, {
        format: 'blob',
        requestTimeoutMs: 30_000,
      })

      const contentState = await determineFileContentState(blob)

      state.setFileContent(normalizedPath, contentState)
    } catch (err) { 
      const errorMessage = SandboxManager.pipeError(err, 'Failed to read file')

      console.error(`Failed to read file ${normalizedPath}:`, err)

      state.setError(normalizedPath, errorMessage)
      state.setFileContent(normalizedPath, { type: 'unreadable' })
    } finally {
      state.setLoading(normalizedPath, false)
      state.setLoaded(normalizedPath, true)
    }
  }

  async getDownloadUrl(path: string): Promise<string> {
    const normalizedPath = normalizePath(path)
    const state = this.store.getState()
    const node = state.getNode(normalizedPath)

    if (!node || node.type !== FileType.FILE) {
      console.error(
        `Failed to get download URL for file. Invalid node: ${node} ${normalizedPath}`
      )
      state.setError(normalizedPath, 'Node is not a directory.')

      return ''
    }

    const downloadUrl = await this.sandbox.downloadUrl(normalizedPath, {
      user: 'root',
      useSignature: this.isSandboxSecure || undefined,
    })

    console.log('downloadUrl', downloadUrl)

    return downloadUrl
  }

  /**
   * Small utility to create a deferred promise (aka Promise with exposed
   * resolve/reject).
   */
  private static createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise: Promise<T> = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }

  /**
   * Returns a user-friendly message for a given error. It checks the error's
   * message against known substrings in `errorMap` and falls back to the
   * supplied default message if no match is found.
   */
  private static pipeError(error: unknown, defaultMessage: string): string {
    const originalMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : ''

    const lowerOriginal = originalMessage.toLowerCase()

    for (const [search, msg] of Object.entries(HANDLED_ERRORS)) {
      if (lowerOriginal.includes(search.toLowerCase())) {
        return msg
      }
    }

    return originalMessage || defaultMessage
  }
}
