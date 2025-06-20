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
  eventManager: FilesystemEventManager | null
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
  const storeRef = useRef<FilesystemStore | null>(null)
  const eventManagerRef = useRef<FilesystemEventManager | null>(null)
  const operationsRef = useRef<FilesystemOperations | null>(null)

  const sandboxId = useMemo(
    () => sandboxInfo.sandboxID + '-' + sandboxInfo.clientID,
    [sandboxInfo.sandboxID, sandboxInfo.clientID]
  )

  /*
   * ---------- synchronous store initialisation ----------
   * We want the tree to render immediately using the "seedEntries" streamed from the
   * server component (see page.tsx).  We therefore build / populate the Zustand store
   * right here during render, instead of doing it later inside an effect.
   */
  {
    const normalizedRoot = normalizePath(rootPath)
    const needsNewStore =
      !storeRef.current ||
      storeRef.current.getState().rootPath !== normalizedRoot

    if (needsNewStore) {
      // stop previous watcher (if any)
      if (eventManagerRef.current) {
        eventManagerRef.current.stopWatching()
        eventManagerRef.current = null
      }

      storeRef.current = createFilesystemStore(rootPath)

      const state = storeRef.current.getState()

      const rootName =
        normalizedRoot === '/' ? '/' : normalizedRoot.split('/').pop() || ''

      state.addNodes(getParentPath(normalizedRoot), [
        {
          name: rootName,
          path: normalizedRoot,
          type: 'dir',
          isExpanded: true,
          isLoaded: true,
          children: [],
        },
      ])

      if (seedEntries && seedEntries.length) {
        const seedNodes: FilesystemNode[] = seedEntries.map((entry) => {
          const base = {
            name: entry.name,
            path: normalizePath(entry.path),
          }

          if (entry.type === 'dir') {
            return {
              ...base,
              type: 'dir' as const,
              isExpanded: false,
              isLoaded: false,
              children: [],
            }
          }

          return {
            ...base,
            type: 'file' as const,
          }
        })

        state.addNodes(normalizedRoot, seedNodes)
      }

      const store = storeRef.current
      operationsRef.current = {
        loadDirectory: async (path: string) => {
          await eventManagerRef.current?.loadDirectory(path)
        },
        selectNode: (path: string) => {
          store.getState().setSelected(path)
        },
        toggleDirectory: async (path: string) => {
          const normalizedPath = normalizePath(path)
          const state = store.getState()
          const node = state.getNode(normalizedPath)

          if (!node || node.type !== 'dir') return

          const newExpandedState = !node.isExpanded
          state.setExpanded(normalizedPath, newExpandedState)

          if (newExpandedState && !node.isLoaded) {
            await eventManagerRef.current?.loadDirectory(normalizedPath)
          }
        },
        refreshDirectory: async (path: string) => {
          await eventManagerRef.current?.refreshDirectory(path)
        },
      }
    }
  }

  /*
   * ---------- watcher (side-effect) initialisation / cleanup ----------
   */
  useLayoutEffect(() => {
    if (!storeRef.current) return

    // (re)create the event-manager when sandbox / team / root changes
    if (eventManagerRef.current) {
      eventManagerRef.current.stopWatching()
    }
    eventManagerRef.current = new FilesystemEventManager(
      storeRef.current,
      sandboxId,
      teamId,
      rootPath
    )

    return () => {
      eventManagerRef.current?.stopWatching()
    }
  }, [sandboxId, teamId, rootPath])

  if (!storeRef.current || !operationsRef.current) {
    return null // should never happen, but satisfies type-checker
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
