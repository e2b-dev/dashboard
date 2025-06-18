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
import { normalizePath, joinPath, getParentPath } from '@/lib/utils/filesystem'

export class FilesystemEventManager {
  private watchHandle?: WatchHandle
  private readonly rootPath: string
  private store: FilesystemStore
  private sandbox: Sandbox

  constructor(store: FilesystemStore, sandbox: Sandbox, rootPath: string) {
    this.store = store
    this.sandbox = sandbox
    this.rootPath = normalizePath(rootPath)

    // Immediately start a single recursive watcher at the root
    void this.startRootWatcher()
  }

  private async startRootWatcher(): Promise<void> {
    if (this.watchHandle) return

    try {
      this.watchHandle = await this.sandbox.files.watchDir(
        this.rootPath,
        (event) => this.handleFilesystemEvent(event),
        { recursive: true }
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
        if (
          !parentNode ||
          parentNode.type !== FileType.DIR ||
          !parentNode.isLoaded
        ) {
          console.debug(
            `Skip refresh for '${normalizedPath}' because parent directory '${parentDir}' does not exist in store`
          )
          return
        }

        console.log(
          `Filesystem ${type} event for '${normalizedPath}', refreshing parent '${parentDir}'`
        )
        void this.refreshDirectory(parentDir)
        break

      case FilesystemEventType.REMOVE:
        if (!state.getNode(normalizedPath)) {
          console.debug(
            `Skip remove for '${normalizedPath}' because node does not exist in store`
          )
          return
        }

        console.log(
          `Filesystem REMOVE event for '${normalizedPath}', removing node from store`
        )
        this.handleRemoveEvent(normalizedPath)
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

  private handleRemoveEvent(removedPath: string): void {
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
}
