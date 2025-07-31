'use client'

import {
  getBasename,
  getParentPath,
  isChildPath,
  normalizePath,
} from '@/lib/utils/filesystem'
import { enableMapSet } from 'immer'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { FilesystemNode } from './types'

enableMapSet()

interface FilesystemStatics {
  rootPath: string
}

interface ContentFileContentState {
  text: string
  type: 'text'
}

interface UnreadableFileContentState {
  type: 'unreadable'
}

interface ImageFileContentState {
  dataUri: string
  type: 'image'
}

export type FileContentState =
  | ContentFileContentState
  | UnreadableFileContentState
  | ImageFileContentState

export type FileContentStateType = FileContentState['type']

// mutable state
export interface FilesystemState {
  nodes: Map<string, FilesystemNode>
  selectedPath?: string
  loadingPaths: Set<string>
  loadedPaths: Set<string>
  errorPaths: Map<string, string>
  sortingDirection: 'asc' | 'desc'
  fileContents: Map<string, FileContentState>
  lastUpdated: Date | null
  watcherError: string | null
}

// mutations/actions that modify state
export interface FilesystemMutations {
  addNodes: (parentPath: string, nodes: FilesystemNode[]) => void
  removeNode: (path: string) => void
  updateNode: (path: string, updates: Partial<FilesystemNode>) => void
  setExpanded: (path: string, expanded: boolean) => void
  setSelected: (path?: string) => void
  setLoading: (path: string, loading: boolean) => void
  setLoaded: (path: string, loaded: boolean) => void
  setError: (path: string, error?: string) => void
  setFileContent: (path: string, updates: FileContentState) => void
  resetFileContent: (path: string) => void
  reset: () => void
  setLastUpdated: (lastUpdated: Date | null) => void
  setWatcherError: (error: string | null) => void
}

// computed/derived values
export interface FilesystemComputed {
  getChildren: (path: string) => FilesystemNode[]
  getNode: (path: string) => FilesystemNode | undefined
  isExpanded: (path: string) => boolean
  isSelected: (path: string) => boolean
  isLoaded: (path: string) => boolean
  hasChildren: (path: string) => boolean
  getFileContent: (path: string) => FileContentState | undefined
}

// combined store type
export type FilesystemStoreData = FilesystemStatics &
  FilesystemState &
  FilesystemMutations &
  FilesystemComputed

// Retain reference-stable arrays of children per directory path. A cached array
// is only reused while the underlying `children` array reference on the node
// stays the same; any mutation that replaces `children` with a new array
// automatically invalidates the cache.
const childrenCache: Map<string, { ref: string[]; result: FilesystemNode[] }> =
  new Map()

function compareFilesystemNodes(
  nodeA: FilesystemNode | undefined,
  nodeB: FilesystemNode | undefined,
  direction: 'asc' | 'desc' = 'asc'
): number {
  if (!nodeA || !nodeB) return 0

  if (nodeA.type === 'dir' && nodeB.type === 'file') return -1
  if (nodeA.type === 'file' && nodeB.type === 'dir') return 1

  const cmp = nodeA.name.localeCompare(nodeB.name, undefined, {
    sensitivity: 'base',
    numeric: true,
  })

  return direction === 'asc' ? cmp : -cmp
}

export const createFilesystemStore = (rootPath: string) =>
  create<FilesystemStoreData>()(
    immer((set, get) => ({
      rootPath: normalizePath(rootPath),

      nodes: new Map<string, FilesystemNode>(),
      loadingPaths: new Set<string>(),
      loadedPaths: new Set<string>(),
      errorPaths: new Map<string, string>(),
      sortingDirection: 'asc' as 'asc' | 'desc',
      fileContents: new Map<string, FileContentState>(),
      lastUpdated: new Date(),
      watcherError: null,

      addNodes: (parentPath: string, nodes: FilesystemNode[]) => {
        const normalizedParentPath = normalizePath(parentPath)

        set((state: FilesystemState) => {
          let parentNode = state.nodes.get(normalizedParentPath)

          if (!parentNode) {
            const parentName = getBasename(normalizedParentPath)

            parentNode = {
              name: parentName,
              path: normalizedParentPath,
              type: 'dir',
              isExpanded: false,
              children: [],
            }
            state.nodes.set(normalizedParentPath, parentNode)
          }

          if (parentNode.type === 'file') {
            throw new Error('Parent node is a file')
          }

          const childrenSet = new Set<string>(parentNode.children)

          for (const node of nodes) {
            const normalizedPath = normalizePath(node.path)

            state.nodes.set(normalizedPath, {
              ...node,
              path: normalizedPath,
            })

            if (normalizedPath !== normalizedParentPath) {
              childrenSet.add(normalizedPath)
            }
          }

          const newChildren = Array.from(childrenSet)
          newChildren.sort((a: string, b: string) =>
            compareFilesystemNodes(
              state.nodes.get(a),
              state.nodes.get(b),
              state.sortingDirection
            )
          )

          parentNode.children = newChildren

          childrenCache.delete(normalizedParentPath)
        })
      },

      removeNode: (path: string) => {
        const normalizedPath = normalizePath(path)

        set((state: FilesystemStoreData) => {
          const node = state.nodes.get(normalizedPath)
          if (!node) return

          const parentPath = getParentPath(normalizedPath)
          const parentNode = state.nodes.get(parentPath)
          if (parentNode && parentNode.type === 'dir') {
            parentNode.children = parentNode.children.filter(
              (childPath: string) => childPath !== normalizedPath
            )

            childrenCache.delete(parentPath)
          }

          for (const [nodePath] of state.nodes) {
            if (
              nodePath === normalizedPath ||
              isChildPath(normalizedPath, nodePath)
            ) {
              state.nodes.delete(nodePath)
              state.loadingPaths.delete(nodePath)
              state.errorPaths.delete(nodePath)

              if (state.selectedPath === nodePath) {
                state.selectedPath = undefined
              }
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

          if (node?.type === 'file') {
            console.error('Cannot expand file', node)
            return
          }

          node.isExpanded = expanded
        })
      },

      setSelected: (path) => {
        const normalizedPath = path ? normalizePath(path) : undefined

        set((state: FilesystemState) => {
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
        })
      },

      setLoaded: (path: string, loaded: boolean) => {
        const normalizedPath = normalizePath(path)
        set((state: FilesystemState) => {
          if (loaded) {
            state.loadedPaths.add(normalizedPath)
          } else {
            state.loadedPaths.delete(normalizedPath)
          }
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
        })
      },

      setFileContent: (path, updates) => {
        const normalizedPath = normalizePath(path)
        set((state: FilesystemState) => {
          state.fileContents.set(normalizedPath, updates)
        })
      },

      resetFileContent: (path: string) => {
        const normalizedPath = normalizePath(path)
        set((state: FilesystemState) => {
          state.fileContents.delete(normalizedPath)
        })
      },

      reset: () => {
        set((state: FilesystemState) => {
          state.nodes.clear()
          state.selectedPath = undefined
          state.loadingPaths.clear()
          state.errorPaths.clear()
          state.fileContents.clear()
        })
      },

      getChildren: (path: string) => {
        const normalizedPath = normalizePath(path)
        const state = get()
        const node = state.nodes.get(normalizedPath)

        if (!node || node.type === 'file') return []

        const cached = childrenCache.get(normalizedPath)
        if (cached && cached.ref === node.children) {
          return cached.result
        }

        const result = node.children
          .map((childPath) => state.nodes.get(childPath))
          .filter((child): child is FilesystemNode => child !== undefined)

        childrenCache.set(normalizedPath, { ref: node.children, result })
        return result
      },

      getNode: (path: string) => {
        const normalizedPath = normalizePath(path)
        return get().nodes.get(normalizedPath)
      },

      isExpanded: (path: string) => {
        const normalizedPath = normalizePath(path)
        const node = get().nodes.get(normalizedPath)

        if (!node || node.type === 'file') return false

        return !!node.isExpanded
      },

      isSelected: (path: string) => {
        const normalizedPath = normalizePath(path)
        const node = get().nodes.get(normalizedPath)

        if (!node) return false

        return get().selectedPath === normalizedPath
      },

      isLoaded: (path: string) => {
        const normalizedPath = normalizePath(path)
        return get().loadedPaths.has(normalizedPath)
      },

      hasChildren: (path: string) => {
        const normalizedPath = normalizePath(path)
        const node = get().nodes.get(normalizedPath)

        if (!node || node.type === 'file') return false

        return node.children.length > 0
      },

      getFileContent: (path: string) => {
        const normalizedPath = normalizePath(path)
        return get().fileContents.get(normalizedPath)
      },

      setLastUpdated: (lastUpdated) => {
        set((state: FilesystemState) => {
          state.lastUpdated = lastUpdated
        })
      },

      setWatcherError: (error) => {
        set((state: FilesystemState) => {
          state.watcherError = error
        })
      },
    }))
  )

export type FilesystemStore = ReturnType<typeof createFilesystemStore>
