'use client'

import React, {
  createContext,
  useContext,
  useRef,
  ReactNode,
  useMemo,
  useLayoutEffect,
} from 'react'
import { FileType, Sandbox } from 'e2b'
import { createFilesystemStore, type FilesystemStore } from './filesystem/store'
import { FilesystemNode, FilesystemOperations } from './filesystem/types'
import { FilesystemEventManager } from './filesystem/events-manager'
import { getParentPath, normalizePath } from '@/lib/utils/filesystem'
import { supabase } from '@/lib/clients/supabase/client'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'

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
  sandboxId: string
  teamId: string
  rootPath: string
}

export function SandboxInspectProvider({
  children,
  teamId,
  sandboxId,
  rootPath,
}: SandboxInspectProviderProps) {
  const sandboxRef = useRef<Sandbox>(null)
  const storeRef = useRef<FilesystemStore>(null)
  const eventManagerRef = useRef<FilesystemEventManager>(null)

  useLayoutEffect(() => {
    if (sandboxRef.current || !teamId) return

    const connectSandbox = async () => {
      const accessToken = await supabase.auth.getSession().then(({ data }) => {
        return data.session?.access_token
      })

      if (!accessToken) {
        throw new Error('No access token found')
      }

      sandboxRef.current = await Sandbox.connect(sandboxId, {
        headers: {
          ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
        },
      })
    }

    connectSandbox()
  }, [sandboxId, teamId])

  useLayoutEffect(() => {
    if (!sandboxRef.current || storeRef.current) return

    storeRef.current = createFilesystemStore(rootPath)
    eventManagerRef.current = new FilesystemEventManager(
      storeRef.current,
      sandboxRef.current
    )
  }, [rootPath, sandboxRef, storeRef])

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
        await eventManagerRef.current.startWatching(normalizedRootPath)
      } catch (error) {
        console.error('Failed to initialize root directory:', error)
        state.setError(normalizedRootPath, 'Failed to load root directory')
      }
    }

    initializeRoot()

    return () => {
      if (eventManagerRef.current) {
        eventManagerRef.current.stopAllWatching()
      }
    }
  }, [rootPath, sandboxRef])

  const operations = useMemo<FilesystemOperations>(() => {
    if (!storeRef.current || !eventManagerRef.current) {
      throw new Error('Filesystem store or event manager not initialized')
    }
    const eventManager = eventManagerRef.current
    const store = storeRef.current

    return {
      loadDirectory: async (path: string) => {
        await eventManager.loadDirectory(path)
      },
      watchDirectory: async (path: string) => {
        await eventManager.startWatching(path)
      },
      unwatchDirectory: (path: string) => {
        eventManager.stopWatching(path)
      },
      selectNode: (path: string) => {
        store.getState().setSelected(path)
      },
      toggleDirectory: async (path: string) => {
        const normalizedPath = normalizePath(path)
        const state = store.getState()
        const node = state.getNode(normalizedPath)

        if (!node || node.type !== FileType.DIR) return

        const newExpandedState = !node.isExpanded
        state.setExpanded(normalizedPath, newExpandedState)

        if (newExpandedState) {
          if (!node.isLoaded) {
            await eventManager.loadDirectory(normalizedPath)
          }
          if (!eventManager.isWatching(normalizedPath)) {
            try {
              await eventManager.startWatching(normalizedPath)
            } catch (error) {
              console.error(
                `Failed to start watching ${normalizedPath}:`,
                error
              )
            }
          }
        }
      },
      refreshDirectory: async (path: string) => {
        await eventManager.refreshDirectory(path)
      },
    }
  }, [])

  if (!storeRef.current || !eventManagerRef.current || !sandboxRef.current) {
    return null
  }

  const contextValue: SandboxInspectContextValue = {
    store: storeRef.current,
    operations: operations,
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
