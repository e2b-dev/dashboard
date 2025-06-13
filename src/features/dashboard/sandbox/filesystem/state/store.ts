import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  normalizePath,
  getParentPath,
  isChildPath,
} from '@/lib/utils/filesystem'
import { FileType } from 'e2b'
import { FilesystemNode } from './types'

interface FilesystemStatics {
  rootPath: string
}

// Mutable state
export interface FilesystemState {
  nodes: Map<string, FilesystemNode>
  selectedPath?: string
  watchedPaths: Set<string>
  loadingPaths: Set<string>
  errorPaths: Map<string, string>
}

// Mutations/actions that modify state
export interface FilesystemMutations {
  addNodes: (parentPath: string, nodes: FilesystemNode[]) => void
  removeNode: (path: string) => void
  updateNode: (path: string, updates: Partial<FilesystemNode>) => void
  setExpanded: (path: string, expanded: boolean) => void
  setSelected: (path: string) => void
  setLoading: (path: string, loading: boolean) => void
  setError: (path: string, error?: string) => void
  reset: () => void
}

// Computed/derived values
export interface FilesystemComputed {
  getChildren: (path: string) => FilesystemNode[]
  getNode: (path: string) => FilesystemNode | undefined
  isExpanded: (path: string) => boolean
  isSelected: (path: string) => boolean
  hasChildren: (path: string) => boolean
}

// Combined store type
export type FilesystemStoreData = FilesystemStatics &
  FilesystemState &
  FilesystemMutations &
  FilesystemComputed

export const createFilesystemStore = (rootPath: string) =>
  create<FilesystemStoreData>()(
    immer((set, get) => ({
      // statics
      rootPath: normalizePath(rootPath),

      // core
      nodes: new Map<string, FilesystemNode>(),
      watchedPaths: new Set<string>(),

      // loading states
      loadingPaths: new Set<string>(),
      errorPaths: new Map<string, string>(),

      // actions
      addNodes: (parentPath: string, nodes: FilesystemNode[]) => {
        const normalizedParentPath = normalizePath(parentPath)

        set((state: FilesystemState) => {
          // get or create parent node
          let parentNode = state.nodes.get(normalizedParentPath)

          if (!parentNode) {
            // create parent node if it doesn't exist
            const parentName =
              normalizedParentPath === '/'
                ? '/'
                : normalizedParentPath.split('/').pop() || ''
            parentNode = {
              name: parentName,
              path: normalizedParentPath,
              type: FileType.DIR,
              isExpanded: false,
              children: [],
            }
            state.nodes.set(normalizedParentPath, parentNode)
          }

          if (parentNode.type === FileType.FILE) {
            console.error('Parent node is a file', parentNode)
            return
          }

          // Ensure parent has children array
          if (!parentNode.children) {
            parentNode.children = []
          }

          // Add new nodes
          for (const node of nodes) {
            const normalizedPath = normalizePath(node.path)

            // Add to nodes map
            state.nodes.set(normalizedPath, {
              ...node,
              path: normalizedPath,
            })

            // Add to parent's children if not already there and if it's not the parent itself
            if (
              normalizedPath !== normalizedParentPath &&
              !parentNode.children.includes(normalizedPath)
            ) {
              parentNode.children.push(normalizedPath)
            }
          }

          // Sort children by type (directories first) then by name
          parentNode.children.sort((a: string, b: string) => {
            const nodeA = state.nodes.get(a)
            const nodeB = state.nodes.get(b)

            if (!nodeA || !nodeB) return 0

            // Directories first
            if (nodeA.type === 'dir' && nodeB.type === 'file') return -1
            if (nodeA.type === 'file' && nodeB.type === 'dir') return 1

            // Then alphabetically
            return nodeA.name.localeCompare(nodeB.name)
          })
        })
      },

      removeNode: (path: string) => {
        const normalizedPath = normalizePath(path)

        set((state: FilesystemState) => {
          const node = state.nodes.get(normalizedPath)
          if (!node) return

          // Remove from parent's children
          const parentPath = getParentPath(normalizedPath)
          const parentNode = state.nodes.get(parentPath)
          if (parentNode && parentNode.type === FileType.DIR) {
            parentNode.children = parentNode.children.filter(
              (childPath: string) => childPath !== normalizedPath
            )
          }

          // Remove node and all its descendants
          const toRemove = [normalizedPath]
          for (const [nodePath] of state.nodes) {
            if (isChildPath(normalizedPath, nodePath)) {
              toRemove.push(nodePath)
            }
          }

          for (const pathToRemove of toRemove) {
            state.nodes.delete(pathToRemove)
            state.loadingPaths.delete(pathToRemove)
            state.errorPaths.delete(pathToRemove)
            state.watchedPaths.delete(pathToRemove)

            // Clear selection if removing selected node
            if (state.selectedPath === pathToRemove) {
              state.selectedPath = undefined
            }
          }
        })
      },

      updateNode: (path: string, updates: Partial<FilesystemNode>) => {
        const normalizedPath = normalizePath(path)

        set((state: FilesystemState) => {
          const node = state.nodes.get(normalizedPath)
          if (node) {
            Object.assign(node, updates)
          }
        })
      },

      setExpanded: (path: string, expanded: boolean) => {
        const normalizedPath = normalizePath(path)

        set((state: FilesystemState) => {
          const node = state.nodes.get(normalizedPath)

          if (!node) return

          if (node?.type === FileType.FILE) {
            console.error('Cannot expand file', node)
            return
          }

          node.isExpanded = expanded
        })
      },

      setSelected: (path: string) => {
        const normalizedPath = normalizePath(path)

        set((state: FilesystemState) => {
          // Clear previous selection
          if (state.selectedPath) {
            const prevNode = state.nodes.get(state.selectedPath)

            if (!prevNode) return

            prevNode.isSelected = false
          }

          // Set new selection
          const node = state.nodes.get(normalizedPath)

          if (!node) return

          node.isSelected = true
          state.selectedPath = normalizedPath
        })
      },

      setLoading: (path: string, loading: boolean) => {
        const normalizedPath = normalizePath(path)

        set((state: FilesystemState) => {
          if (loading) {
            state.loadingPaths.add(normalizedPath)
          } else {
            state.loadingPaths.delete(normalizedPath)
          }

          // Update node loading state
          const node = state.nodes.get(normalizedPath)

          if (!node || node.type === FileType.FILE) return

          node.isLoading = loading
        })
      },

      setError: (path: string, error?: string) => {
        const normalizedPath = normalizePath(path)

        set((state: FilesystemState) => {
          if (error) {
            state.errorPaths.set(normalizedPath, error)
          } else {
            state.errorPaths.delete(normalizedPath)
          }

          // Update node error state
          const node = state.nodes.get(normalizedPath)

          if (!node || node.type === FileType.FILE) return

          node.error = error
        })
      },

      reset: () => {
        set((state: FilesystemState) => {
          state.nodes.clear()
          state.selectedPath = undefined
          state.watchedPaths.clear()
          state.loadingPaths.clear()
          state.errorPaths.clear()
        })
      },

      // computed
      getChildren: (path: string) => {
        const normalizedPath = normalizePath(path)
        const state = get()
        const node = state.nodes.get(normalizedPath)

        if (!node || node.type === FileType.FILE) return []

        return node.children
          .map((childPath) => state.nodes.get(childPath))
          .filter((child): child is FilesystemNode => child !== undefined)
      },

      getNode: (path: string) => {
        const normalizedPath = normalizePath(path)
        return get().nodes.get(normalizedPath)
      },

      isExpanded: (path: string) => {
        const normalizedPath = normalizePath(path)
        const node = get().nodes.get(normalizedPath)

        if (!node || node.type === FileType.FILE) return false

        return !!node.isExpanded
      },

      isSelected: (path: string) => {
        const normalizedPath = normalizePath(path)
        const node = get().nodes.get(normalizedPath)

        if (!node) return false

        return !!node.isSelected
      },

      hasChildren: (path: string) => {
        const normalizedPath = normalizePath(path)
        const node = get().nodes.get(normalizedPath)

        if (!node || node.type === FileType.FILE) return false

        return node.children.length > 0
      },
    }))
  )

export type FilesystemStore = ReturnType<typeof createFilesystemStore>
