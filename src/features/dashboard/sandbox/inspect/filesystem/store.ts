'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import {
  normalizePath,
  getParentPath,
  isChildPath,
} from '@/lib/utils/filesystem'
import { FilesystemNode } from './types'
import { FileType } from 'e2b'

enableMapSet()

interface FilesystemStatics {
  rootPath: string
}

interface FileContentState {
  content?: string
}

// mutable state
export interface FilesystemState {
  nodes: Map<string, FilesystemNode>
  selectedPath?: string
  loadingPaths: Set<string>
  errorPaths: Map<string, string>
  sortingDirection: 'asc' | 'desc'
  fileContents: Map<string, FileContentState>
}

// mutations/actions that modify state
export interface FilesystemMutations {
  addNodes: (parentPath: string, nodes: FilesystemNode[]) => void
  removeNode: (path: string) => void
  updateNode: (path: string, updates: Partial<FilesystemNode>) => void
  setExpanded: (path: string, expanded: boolean) => void
  setSelected: (path: string) => void
  setLoading: (path: string, loading: boolean) => void
  setError: (path: string, error?: string) => void
  setFileContent: (path: string, updates: Partial<FileContentState>) => void
  resetFileContent: (path: string) => void
  reset: () => void
}

// computed/derived values
export interface FilesystemComputed {
  getChildren: (path: string) => FilesystemNode[]
  getNode: (path: string) => FilesystemNode | undefined
  isExpanded: (path: string) => boolean
  isSelected: (path: string) => boolean
  hasChildren: (path: string) => boolean
  getFileContent: (path: string) => FileContentState | undefined
}

// combined store type
export type FilesystemStoreData = FilesystemStatics &
  FilesystemState &
  FilesystemMutations &
  FilesystemComputed

// to retain reference-stable arrays of children per directory path
const childrenCache: Map<string, { ref: string[]; result: FilesystemNode[] }> =
  new Map()

function compareFilesystemNodes(
  nodeA: FilesystemNode | undefined,
  nodeB: FilesystemNode | undefined,
  direction: 'asc' | 'desc' = 'asc'
): number {
  if (!nodeA || !nodeB) return 0

  if (nodeA.type === FileType.DIR && nodeB.type === FileType.FILE) return -1
  if (nodeA.type === FileType.FILE && nodeB.type === FileType.DIR) return 1

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
      errorPaths: new Map<string, string>(),
      sortingDirection: 'asc' as 'asc' | 'desc',
      fileContents: new Map<string, FileContentState>(),

      addNodes: (parentPath: string, nodes: FilesystemNode[]) => {
        const normalizedParentPath = normalizePath(parentPath)

        set((state: FilesystemState) => {
          let parentNode = state.nodes.get(normalizedParentPath)

          if (!parentNode) {
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

          if (!parentNode.children) {
            parentNode.children = []
          }

          for (const node of nodes) {
            const normalizedPath = normalizePath(node.path)

            state.nodes.set(normalizedPath, {
              ...node,
              path: normalizedPath,
            })

            if (
              normalizedPath !== normalizedParentPath &&
              !parentNode.children.includes(normalizedPath)
            ) {
              parentNode.children.push(normalizedPath)
            }
          }

          parentNode.children.sort((a: string, b: string) =>
            compareFilesystemNodes(
              state.nodes.get(a),
              state.nodes.get(b),
              state.sortingDirection
            )
          )
        })
      },

      removeNode: (path: string) => {
        const normalizedPath = normalizePath(path)

        set((state: FilesystemStoreData) => {
          const node = state.nodes.get(normalizedPath)
          if (!node) return

          const parentPath = getParentPath(normalizedPath)
          const parentNode = state.nodes.get(parentPath)
          if (parentNode && parentNode.type === FileType.DIR) {
            parentNode.children = parentNode.children.filter(
              (childPath: string) => childPath !== normalizedPath
            )
          }

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
          if (state.selectedPath) {
            const prevNode = state.nodes.get(state.selectedPath)

            if (!prevNode) return

            prevNode.isSelected = false
          }

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

          const node = state.nodes.get(normalizedPath)

          if (!node) return

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

          const node = state.nodes.get(normalizedPath)

          if (!node) return

          node.error = error
        })
      },

      setFileContent: (path: string, updates: Partial<FileContentState>) => {
        const normalizedPath = normalizePath(path)
        set((state: FilesystemState) => {
          const existing =
            state.fileContents.get(normalizedPath) ?? ({} as FileContentState)
          state.fileContents.set(normalizedPath, {
            ...existing,
            ...updates,
          })
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

        if (!node || node.type === FileType.FILE) return []

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

      getFileContent: (path: string) => {
        const normalizedPath = normalizePath(path)
        return get().fileContents.get(normalizedPath)
      },
    }))
  )

export type FilesystemStore = ReturnType<typeof createFilesystemStore>
