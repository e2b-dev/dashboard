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

  /**
   * Start watching a directory for changes
   */
  async startWatching(path: string): Promise<void> {
    const normalizedPath = normalizePath(path)

    // Don't start watching if already watching
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

      // Mark as watched in store
      this.store.getState().watchedPaths.add(normalizedPath)
    } catch (error) {
      console.error(`Failed to start watching ${normalizedPath}:`, error)
      throw error
    }
  }

  /**
   * Stop watching a directory
   */
  stopWatching(path: string): void {
    const normalizedPath = normalizePath(path)
    const handle = this.watchHandles.get(normalizedPath)

    if (handle) {
      handle.stop()
      this.watchHandles.delete(normalizedPath)

      // Remove from watched paths in store
      this.store.getState().watchedPaths.delete(normalizedPath)
    }
  }

  /**
   * Stop watching all directories
   */
  stopAllWatching(): void {
    for (const [path] of this.watchHandles) {
      this.stopWatching(path)
    }
  }

  /**
   * Handle incoming filesystem events
   */
  private handleFilesystemEvent(
    event: FilesystemEvent,
    parentPath: string
  ): void {
    const { type, name } = event
    const normalizedPath = normalizePath(joinPath(parentPath, name))

    switch (type) {
      case FilesystemEventType.CREATE:
      case FilesystemEventType.REMOVE:
      case FilesystemEventType.RENAME:
        // A filesystem event occurred that changed the directory structure.
        // We don't have enough information to granularly update the store (e.g. on CREATE, we don't know if it's a file or dir).
        // The most robust approach is to refresh the parent directory's contents from the sandbox.
        console.log(
          `Filesystem event '${type}' for '${normalizedPath}', refreshing parent '${parentPath}'`
        )
        this.refreshDirectory(parentPath)
        break

      case FilesystemEventType.WRITE:
      case FilesystemEventType.CHMOD:
        // For now, we don't handle these events as they don't change the tree structure.
        // We could potentially use them to update file-specific state in the future (e.g., last modified time).
        break
    }
  }

  /**
   * Load directory contents from the sandbox
   */
  async loadDirectory(path: string): Promise<void> {
    const normalizedPath = normalizePath(path)
    const state = this.store.getState()

    // Check if already loaded or loading
    const node = state.getNode(normalizedPath)

    if (
      !node ||
      node.type !== FileType.DIR ||
      node.isLoaded ||
      state.loadingPaths.has(normalizedPath)
    )
      return

    // Set loading state
    state.setLoading(normalizedPath, true)
    state.setError(normalizedPath) // Clear any previous errors

    try {
      const entries = await this.sandbox.files.list(normalizedPath)

      // Convert entries to filesystem nodes
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

      // Add nodes to store
      state.addNodes(normalizedPath, nodes)

      // Mark directory as loaded
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

  /**
   * Refresh directory contents (force reload)
   */
  async refreshDirectory(path: string): Promise<void> {
    const normalizedPath = normalizePath(path)
    const state = this.store.getState()

    // Mark as not loaded to force refresh
    state.updateNode(normalizedPath, { isLoaded: false })

    // Clear existing children
    const node = state.getNode(normalizedPath)
    if (node && node.type === FileType.DIR) {
      // Create a copy of children paths, as the store mutation will modify the original array
      const childrenPaths = [...node.children]
      // Remove all children from store, which will also recursively remove their descendants
      for (const childPath of childrenPaths) {
        state.removeNode(childPath)
      }
    }

    // Reload directory
    await this.loadDirectory(normalizedPath)
  }

  /**
   * Check if a directory is being watched
   */
  isWatching(path: string): boolean {
    const normalizedPath = normalizePath(path)
    return this.watchHandles.has(normalizedPath)
  }

  /**
   * Get all watched paths
   */
  getWatchedPaths(): string[] {
    return Array.from(this.watchHandles.keys())
  }
}
