import { FsEvent, FsEntry } from '@/types/filesystem'
import type { FilesystemStore } from './store'
import { FilesystemNode } from './types'
import { normalizePath, joinPath, getParentPath } from '@/lib/utils/filesystem'

export class FilesystemEventManager {
  private unsubscribe?: () => void
  private readonly rootPath: string
  private store: FilesystemStore
  private sandboxId: string
  private teamId: string

  constructor(
    store: FilesystemStore,
    sandboxId: string,
    teamId: string,
    rootPath: string
  ) {
    this.store = store
    this.sandboxId = sandboxId
    this.teamId = teamId
    this.rootPath = normalizePath(rootPath)

    void this.startRootWatcher()
  }

  private async startRootWatcher(): Promise<void> {
    if (this.unsubscribe) return

    this.unsubscribe = openWatcher(
      this.sandboxId,
      this.rootPath,
      this.teamId,
      (event) => this.handleFilesystemEvent(event)
    )
  }

  stopWatching(): void {
    this.unsubscribe?.()
    this.unsubscribe = undefined
  }

  private handleFilesystemEvent(event: FsEvent): void {
    const { type, name } = event

    // "name" is relative to the watched root; construct absolute path
    const normalizedPath = normalizePath(joinPath(this.rootPath, name))
    const parentDir = normalizePath(
      joinPath(this.rootPath, getParentPath(name))
    )

    const state = this.store.getState()
    const parentNode = state.getNode(parentDir)

    switch (type) {
      case 'create':
      case 'rename':
        if (!parentNode || parentNode.type !== 'dir' || !parentNode.isLoaded) {
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

      case 'remove':
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

      case 'write':
      case 'chmod':
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
      node.type !== 'dir' ||
      node.isLoaded ||
      state.loadingPaths.has(normalizedPath)
    )
      return

    state.setLoading(normalizedPath, true)
    state.setError(normalizedPath) // clear any previous errors

    try {
      const entries = await listDir(this.sandboxId, normalizedPath, this.teamId)

      const nodes: FilesystemNode[] = entries.map((entry) => {
        if (entry.type === 'dir') {
          return {
            name: entry.name,
            path: entry.path,
            type: 'dir',
            isExpanded: false,
            isSelected: false,
            isLoaded: false,
            children: [],
          }
        } else {
          return {
            name: entry.name,
            path: entry.path,
            type: 'file',
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
    if (node && node.type === 'dir') {
      const childrenPaths = [...node.children]
      for (const childPath of childrenPaths) {
        state.removeNode(childPath)
      }
    }

    await this.loadDirectory(normalizedPath)
  }
}

async function listDir(
  sandboxId: string,
  dir: string,
  teamId: string
): Promise<FsEntry[]> {
  const url = `/api/sandboxes/${sandboxId}/list?dir=${encodeURIComponent(dir)}&team=${teamId}`
  return fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error(`List failed ${r.status}`)
    return r.json()
  })
}

function openWatcher(
  sandboxId: string,
  dir: string,
  teamId: string,
  onEvent: (e: FsEvent) => void
): () => void {
  let es: EventSource | null

  const connect = () => {
    const url = `/api/sandboxes/${sandboxId}/watch?dir=${encodeURIComponent(dir)}&team=${teamId}`
    es = new EventSource(url, { withCredentials: true })

    es.onmessage = (ev) => {
      onEvent(JSON.parse(ev.data))
    }
    es.onerror = () => {
      // auto-reconnect in 1 s
      es?.close()
      setTimeout(connect, 1_000)
    }
  }

  connect()
  return () => es?.close()
}
