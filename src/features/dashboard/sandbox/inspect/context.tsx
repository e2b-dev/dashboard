'use client'

import React, {
  createContext,
  useContext,
  useRef,
  ReactNode,
  useMemo,
  useLayoutEffect,
} from 'react'
import { FileType } from 'e2b'
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
  rootPath: string
}

export function SandboxInspectProvider({
  children,
  rootPath,
}: SandboxInspectProviderProps) {
  const { sandbox } = useSandboxContext()
  const storeRef = useRef<FilesystemStore>(null)
  const eventManagerRef = useRef<FilesystemEventManager>(null)
  const operationsRef = useRef<FilesystemOperations>(null)

  useLayoutEffect(() => {
    if (!storeRef.current && sandbox) {
      storeRef.current = createFilesystemStore(rootPath)
      eventManagerRef.current = new FilesystemEventManager(
        storeRef.current,
        sandbox,
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

          if (!node || node.type !== FileType.DIR) {
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
  }, [sandbox, rootPath])

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
          type: FileType.DIR,
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
  }, [rootPath, sandbox])

  if (
    !storeRef.current ||
    !eventManagerRef.current ||
    !sandbox ||
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
