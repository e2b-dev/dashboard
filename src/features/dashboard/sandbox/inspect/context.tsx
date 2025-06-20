'use client'

import React, {
  createContext,
  useContext,
  useRef,
  ReactNode,
  useLayoutEffect,
  useMemo,
} from 'react'
import { FsEntry } from '@/types/filesystem'
import { createFilesystemStore, type FilesystemStore } from './filesystem/store'
import { FilesystemNode, FilesystemOperations } from './filesystem/types'
import { FilesystemEventManager } from './filesystem/events-manager'
import { getParentPath, normalizePath } from '@/lib/utils/filesystem'
import { useSandboxContext } from '../context'

interface SandboxInspectContextValue {
  store: FilesystemStore
  operations: FilesystemOperations
  eventManager: FilesystemEventManager
}

const SandboxInspectContext = createContext<SandboxInspectContextValue | null>(
  null
)

interface SandboxInspectProviderProps {
  children: ReactNode
  teamId: string
  rootPath: string
  seedEntries?: FsEntry[]
}

export function SandboxInspectProvider({
  children,
  teamId,
  rootPath,
  seedEntries,
}: SandboxInspectProviderProps) {
  const { sandboxInfo } = useSandboxContext()
  const storeRef = useRef<FilesystemStore>(null)
  const eventManagerRef = useRef<FilesystemEventManager>(null)
  const operationsRef = useRef<FilesystemOperations>(null)

  const sandboxId = useMemo(
    () => sandboxInfo.sandboxID + '-' + sandboxInfo.clientID,
    [sandboxInfo.sandboxID, sandboxInfo.clientID]
  )

  useLayoutEffect(() => {
    const normalizedRoot = normalizePath(rootPath)
    const currentRoot = storeRef.current?.getState().rootPath

    if (!storeRef.current || currentRoot !== normalizedRoot) {
      if (eventManagerRef.current) {
        eventManagerRef.current.stopWatching()
      }

      storeRef.current = createFilesystemStore(rootPath, seedEntries ?? [])
      eventManagerRef.current = new FilesystemEventManager(
        storeRef.current,
        sandboxId,
        teamId,
        rootPath
      )

      const eventManager = eventManagerRef.current
      const store = storeRef.current

      operationsRef.current = {
        loadDirectory: async (path: string) => {
          await eventManager.loadDirectory(path)
        },
        selectNode: (path: string) => {
          store.getState().setSelected(path)
        },
        toggleDirectory: async (path: string) => {
          const normalizedPath = normalizePath(path)
          const state = store.getState()
          const node = state.getNode(normalizedPath)

          if (!node || node.type !== 'dir') {
            console.log(`Cannot toggle non-directory node at path: ${path}`)
            return
          }

          const newExpandedState = !node.isExpanded
          console.log(
            `Toggling directory ${path} to ${newExpandedState ? 'expanded' : 'collapsed'}`
          )

          state.setExpanded(normalizedPath, newExpandedState)

          if (newExpandedState) {
            if (!node.isLoaded) {
              console.log(`Loading unloaded directory: ${path}`)
              await eventManager.loadDirectory(normalizedPath)
            } else {
              console.log(`Directory already loaded: ${path}`)
            }
          }
        },
        refreshDirectory: async (path: string) => {
          await eventManager.refreshDirectory(path)
        },
      }
    }
  }, [sandboxId, teamId, seedEntries, rootPath])

  useLayoutEffect(() => {
    const initializeRoot = async () => {
      if (!storeRef.current || !eventManagerRef.current) return

      const state = storeRef.current.getState()
      const normalizedRootPath = normalizePath(rootPath)

      if (!state.getNode(normalizedRootPath)) {
        const rootName =
          normalizedRootPath === '/'
            ? '/'
            : normalizedRootPath.split('/').pop() || ''

        const rootNode: FilesystemNode = {
          name: rootName,
          path: normalizedRootPath,
          type: 'dir',
          isExpanded: true,
          isLoaded: false,
          children: [],
        }

        const parentPath = getParentPath(normalizedRootPath)
        state.addNodes(parentPath, [rootNode])
      }

      try {
        await eventManagerRef.current.loadDirectory(normalizedRootPath)
      } catch (error) {
        console.error('Failed to initialize root directory:', error)
        state.setError(normalizedRootPath, 'Failed to load root directory')
      }
    }

    initializeRoot()

    return () => {
      if (eventManagerRef.current) {
        eventManagerRef.current.stopWatching()
      }
    }
  }, [sandboxId, teamId, seedEntries, rootPath])

  if (
    !storeRef.current ||
    !eventManagerRef.current ||
    !sandboxId ||
    !operationsRef.current
  ) {
    return null
  }

  const contextValue: SandboxInspectContextValue = {
    store: storeRef.current,
    operations: operationsRef.current,
    eventManager: eventManagerRef.current,
  }

  return (
    <SandboxInspectContext.Provider value={contextValue}>
      {children}
    </SandboxInspectContext.Provider>
  )
}

export function useSandboxInspectContext(): SandboxInspectContextValue {
  const context = useContext(SandboxInspectContext)
  if (!context) {
    throw new Error(
      'useSandboxInspectContext must be used within a SandboxInspectProvider'
    )
  }
  return context
}
