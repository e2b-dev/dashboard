'use client'

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

// mutable state
export interface FilesystemState {
  nodes: Map<string, FilesystemNode>
  selectedPath?: string
  watchedPaths: Set<string>
  loadingPaths: Set<string>
  errorPaths: Map<string, string>
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
  reset: () => void
}

// computed/derived values
export interface FilesystemComputed {
  getChildren: (path: string) => FilesystemNode[]
  getNode: (path: string) => FilesystemNode | undefined
  isExpanded: (path: string) => boolean
  isSelected: (path: string) => boolean
  hasChildren: (path: string) => boolean
}

// combined store type
export type FilesystemStoreData = FilesystemStatics &
  FilesystemState &
  FilesystemMutations &
  FilesystemComputed

export const createFilesystemStore = (rootPath: string) =>
  create<FilesystemStoreData>()(
    immer((set, get) => ({
      rootPath: normalizePath(rootPath),

      nodes: new Map<string, FilesystemNode>(),
      watchedPaths: new Set<string>(),
      loadingPaths: new Set<string>(),
      errorPaths: new Map<string, string>(),

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

          parentNode.children.sort((a: string, b: string) => {
            const nodeA = state.nodes.get(a)
            const nodeB = state.nodes.get(b)

            if (!nodeA || !nodeB) return 0

            // directories first
            if (nodeA.type === 'dir' && nodeB.type === 'file') return -1
            if (nodeA.type === 'file' && nodeB.type === 'dir') return 1

            // then alphabetically
            return nodeA.name.localeCompare(nodeB.name)
          })
        })
      },

      removeNode: (path: string) => {
        const normalizedPath = normalizePath(path)

        set((state: FilesystemState) => {
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
            state.watchedPaths.delete(pathToRemove)

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
