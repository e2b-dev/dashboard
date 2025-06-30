'use client'

import React, {
  createContext,
  useContext,
  useRef,
  ReactNode,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { createFilesystemStore, type FilesystemStore } from './filesystem/store'
import { FilesystemNode, FilesystemOperations } from './filesystem/types'
import { SandboxManager } from './sandbox-manager'
import { getParentPath, normalizePath } from '@/lib/utils/filesystem'
import { useSandboxContext } from '../context'
import Sandbox, { EntryInfo, FileType } from 'e2b'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { supabase } from '@/lib/clients/supabase/client'
import { useRouter } from 'next/navigation'
import { AUTH_URLS } from '@/configs/urls'

interface SandboxInspectContextValue {
  store: FilesystemStore
  operations: FilesystemOperations
  sandboxManager: SandboxManager | null
}

const SandboxInspectContext = createContext<SandboxInspectContextValue | null>(
  null
)

interface SandboxInspectProviderProps {
  children: ReactNode
  rootPath: string
  teamId: string
  seedEntries?: EntryInfo[]
}

export function SandboxInspectProvider({
  children,
  rootPath,
  seedEntries,
  teamId,
}: SandboxInspectProviderProps) {
  const { sandboxInfo } = useSandboxContext()
  const storeRef = useRef<FilesystemStore | null>(null)
  const sandboxManagerRef = useRef<SandboxManager | null>(null)
  const operationsRef = useRef<FilesystemOperations | null>(null)

  const router = useRouter()

  const sandboxId = useMemo(() => {
    return sandboxInfo.sandboxID + '-' + sandboxInfo.clientID
  }, [sandboxInfo.sandboxID, sandboxInfo.clientID])

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
      if (sandboxManagerRef.current) {
        sandboxManagerRef.current.stopWatching()
        sandboxManagerRef.current = null
      }

      storeRef.current = createFilesystemStore(rootPath)

      const state = storeRef.current.getState()

      const rootName =
        normalizedRoot === '/' ? '/' : normalizedRoot.split('/').pop() || ''

      state.addNodes(getParentPath(normalizedRoot), [
        {
          name: rootName,
          path: normalizedRoot,
          type: FileType.DIR,
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

          if (entry.type === FileType.DIR) {
            return {
              ...base,
              type: FileType.DIR,
              isExpanded: false,
              isLoaded: false,
              children: [],
            }
          }

          return {
            ...base,
            type: FileType.FILE,
          }
        })

        state.addNodes(normalizedRoot, seedNodes)
      }

      const store = storeRef.current
      operationsRef.current = {
        loadDirectory: async (path: string) => {
          await sandboxManagerRef.current?.loadDirectory(path)
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

          if (newExpandedState && !node.isLoaded) {
            await sandboxManagerRef.current?.loadDirectory(normalizedPath)
          }
        },
        refreshDirectory: async (path: string) => {
          await sandboxManagerRef.current?.refreshDirectory(path)
        },
      }
    }
  }

  /*
   * ---------- watcher (side-effect) initialisation / cleanup ----------
   */
  useLayoutEffect(() => {
    const connectSandbox = async () => {
      if (!storeRef.current) return

      // (re)create the sandbox-manager when sandbox / team / root changes
      if (sandboxManagerRef.current) {
        sandboxManagerRef.current.stopWatching()
      }

      const { data } = await supabase.auth.getSession()

      if (!data || !data.session) {
        router.replace(AUTH_URLS.SIGN_IN)
        return
      }

      const sandbox = await Sandbox.connect(sandboxId, {
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        headers: {
          ...SUPABASE_AUTH_HEADERS(data.session?.access_token, teamId),
        },
        secure: true,
      })

      sandboxManagerRef.current = new SandboxManager(
        storeRef.current,
        sandbox,
        rootPath
      )
    }

    connectSandbox()

    return () => {
      sandboxManagerRef.current?.stopWatching()
    }
  }, [sandboxId, teamId, rootPath, router])

  if (!storeRef.current || !operationsRef.current) {
    return null // should never happen, but satisfies type-checker
  }

  const contextValue: SandboxInspectContextValue = {
    store: storeRef.current,
    operations: operationsRef.current,
    sandboxManager: sandboxManagerRef.current,
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
