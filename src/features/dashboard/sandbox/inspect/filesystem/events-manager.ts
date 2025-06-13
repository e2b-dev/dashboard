import {
  FileType,
  type Sandbox,
  type FilesystemEvent,
  type WatchHandle,
  type EntryInfo,
  FilesystemEventType,
} from 'e2b'
import type { FilesystemStore } from './store'
import { FilesystemNode } from './types'
import { normalizePath, joinPath } from '@/lib/utils/filesystem'

export class FilesystemEventManager {
  private watchHandles = new Map<string, WatchHandle>()
  private store: FilesystemStore
  private sandbox: Sandbox

  constructor(store: FilesystemStore, sandbox: Sandbox) {
    this.store = store
    this.sandbox = sandbox
  }

  async startWatching(path: string): Promise<void> {
    const normalizedPath = normalizePath(path)

    if (this.watchHandles.has(normalizedPath)) {
      return
    }

    try {
      const handle = await this.sandbox.files.watchDir(
        normalizedPath,
        (event) => this.handleFilesystemEvent(event, normalizedPath),
        { recursive: false }
      )

      this.watchHandles.set(normalizedPath, handle)
      this.store.getState().watchedPaths.add(normalizedPath)
    } catch (error) {
      console.error(`Failed to start watching ${normalizedPath}:`, error)
      throw error
    }
  }

  stopWatching(path: string): void {
    const normalizedPath = normalizePath(path)
    const handle = this.watchHandles.get(normalizedPath)

    if (handle) {
      handle.stop()
      this.watchHandles.delete(normalizedPath)
      this.store.getState().watchedPaths.delete(normalizedPath)
    }
  }

  stopAllWatching(): void {
    for (const [path] of this.watchHandles) {
      this.stopWatching(path)
    }
  }

  private handleFilesystemEvent(
    event: FilesystemEvent,
    parentPath: string
  ): void {
    const { type, name } = event
    const normalizedPath = normalizePath(joinPath(parentPath, name))

    switch (type) {
      case FilesystemEventType.CREATE:
        console.log(
          `Filesystem CREATE event for '${normalizedPath}', refreshing parent '${parentPath}'`
        )
        void this.refreshDirectory(parentPath)
        break

      case FilesystemEventType.REMOVE:
        console.log(
          `Filesystem REMOVE event for '${normalizedPath}', removing node from store`
        )
        this.handleRemoveEvent(normalizedPath, parentPath)
        break

      case FilesystemEventType.RENAME:
        console.log(
          `Filesystem RENAME event for '${normalizedPath}', refreshing parent '${parentPath}'`
        )
        void this.refreshDirectory(parentPath)
        break

      case FilesystemEventType.WRITE:
      case FilesystemEventType.CHMOD:
        console.debug(`Ignoring ${type} event for '${normalizedPath}'`)
        break

      default:
        console.warn(`Unknown filesystem event type: ${type}`)
        break
    }
  }

  private handleRemoveEvent(removedPath: string, parentPath: string): void {
    const state = this.store.getState()
    const node = state.getNode(removedPath)

    if (!node) {
      console.debug(
        `Node '${removedPath}' not found in store, skipping removal`
      )
      return
    }

    state.removeNode(removedPath)
    console.log(`Successfully removed node '${removedPath}' from store`)

    if (node.type === FileType.DIR && this.isWatching(removedPath)) {
      this.stopWatching(removedPath)
      console.log(`Stopped watching removed directory '${removedPath}'`)
    }
  }

  async loadDirectory(path: string): Promise<void> {
    const normalizedPath = normalizePath(path)
    const state = this.store.getState()
    const node = state.getNode(normalizedPath)

    if (
      !node ||
      node.type !== FileType.DIR ||
      node.isLoaded ||
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
            isLoaded: false,
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
      state.updateNode(normalizedPath, { isLoaded: true })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load directory'
      state.setError(normalizedPath, errorMessage)
      console.error(`Failed to load directory ${normalizedPath}:`, error)
    } finally {
      state.setLoading(normalizedPath, false)
    }
  }

  async refreshDirectory(path: string): Promise<void> {
    const normalizedPath = normalizePath(path)
    const state = this.store.getState()

    state.updateNode(normalizedPath, { isLoaded: false })

    const node = state.getNode(normalizedPath)
    if (node && node.type === FileType.DIR) {
      const childrenPaths = [...node.children]
      for (const childPath of childrenPaths) {
        state.removeNode(childPath)
      }
    }

    await this.loadDirectory(normalizedPath)
  }

  isWatching(path: string): boolean {
    const normalizedPath = normalizePath(path)
    return this.watchHandles.has(normalizedPath)
  }

  getWatchedPaths(): string[] {
    return Array.from(this.watchHandles.keys())
  }
}
