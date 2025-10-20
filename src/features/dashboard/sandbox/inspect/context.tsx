'use client'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { AUTH_URLS } from '@/configs/urls'
import { supabase } from '@/lib/clients/supabase/client'
import { useSandboxInspectAnalytics } from '@/lib/hooks/use-analytics'
import { getParentPath, normalizePath } from '@/lib/utils/filesystem'
import Sandbox, { EntryInfo } from 'e2b'
import { useRouter } from 'next/navigation'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { useDashboard } from '../../context'
import { useSandboxContext } from '../context'
import { createFilesystemStore, type FilesystemStore } from './filesystem/store'
import { FilesystemNode, FilesystemOperations } from './filesystem/types'
import { SandboxManager } from './sandbox-manager'

interface SandboxInspectContextValue {
  store: FilesystemStore
  operations: FilesystemOperations
}

const SandboxInspectContext = createContext<SandboxInspectContextValue | null>(
  null
)

interface SandboxInspectProviderProps {
  children: ReactNode
  rootPath: string
  seedEntries?: EntryInfo[]
}

export function SandboxInspectProvider({
  children,
  rootPath,
  seedEntries,
}: SandboxInspectProviderProps) {
  const { team } = useDashboard()
  const teamId = team?.id

  const { sandboxInfo, isRunning } = useSandboxContext()
  const storeRef = useRef<FilesystemStore | null>(null)
  const sandboxManagerRef = useRef<SandboxManager | null>(null)

  const router = useRouter()
  const { trackInteraction } = useSandboxInspectAnalytics()

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
      trackInteraction('initialized', {
        sandbox_id: sandboxInfo?.sandboxID,
        team_id: teamId,
        root_path: rootPath,
      })

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
          type: 'dir',
          isExpanded: true,
          children: [],
        },
      ])

      state.setLoaded(normalizedRoot, true)

      if (seedEntries && seedEntries.length) {
        const seedNodes: FilesystemNode[] = seedEntries.map((entry) => {
          const base = {
            name: entry.name,
            path: normalizePath(entry.path),
          }

          if (entry.type === 'dir') {
            state.setLoaded(base.path, false)

            return {
              ...base,
              type: 'dir',
              isExpanded: false,
              children: [],
            }
          }

          return {
            ...base,
            type: 'file',
          }
        })

        state.addNodes(normalizedRoot, seedNodes)
      }
    }
  }

  // ---------- filesystem operations exposed via context ----------
  const operations = useMemo<FilesystemOperations>(
    () => ({
      loadDirectory: async (path: string) => {
        if (!isRunning) {
          return
        }

        await sandboxManagerRef.current?.loadDirectory(path)
      },
      selectNode: async (path: string) => {
        const node = storeRef.current!.getState().getNode(path)

        if (!node) return

        if (
          isRunning &&
          node.type === 'file' &&
          !storeRef.current!.getState().isLoaded(path)
        ) {
          await sandboxManagerRef.current?.readFile(path)
        }

        storeRef.current!.getState().setSelected(path)
        if (node.type === 'file') {
          trackInteraction('selected_file', { path })
        }
      },
      resetSelected: () => {
        storeRef.current!.setState((state) => {
          state.selectedPath = undefined
        })
      },
      toggleDirectory: async (path: string) => {
        const normalizedPath = normalizePath(path)
        const state = storeRef.current!.getState()
        const node = state.getNode(normalizedPath)

        if (!node || node.type !== 'dir') return

        const newExpandedState = !node.isExpanded
        state.setExpanded(normalizedPath, newExpandedState)

        if (isRunning && newExpandedState && !state.isLoaded(normalizedPath)) {
          await sandboxManagerRef.current?.loadDirectory(normalizedPath)
        }
        if (newExpandedState) {
          trackInteraction('expanded_dir', { path })
        }
      },
      refreshDirectory: async (path: string) => {
        if (!isRunning) return

        await sandboxManagerRef.current?.refreshDirectory(path)
      },
      refreshFile: async (path: string) => {
        if (!isRunning) return

        await sandboxManagerRef.current?.readFile(path)
      },
      downloadFile: async (path: string) => {
        if (!isRunning) return

        const downloadUrl =
          await sandboxManagerRef.current?.getDownloadUrl(path)

        if (!downloadUrl) return

        const node = storeRef.current!.getState().getNode(path)

        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = node?.name || ''
        a.target = '_blank'
        a.click()

        trackInteraction('downloaded_file', { path })
      },
    }),
    [isRunning, sandboxManagerRef.current, storeRef.current, trackInteraction]
  )

  const connectSandbox = useCallback(async () => {
    if (!storeRef.current || !sandboxInfo) return

    // (re)create the sandbox-manager when sandbox / team / root changes
    if (sandboxManagerRef.current) {
      sandboxManagerRef.current.stopWatching()
    }

    const { data } = await supabase.auth.getSession()

    if (!data || !data.session) {
      router.replace(AUTH_URLS.SIGN_IN)
      return
    }

    const sandbox = await Sandbox.connect(sandboxInfo.sandboxID, {
      domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
      headers: {
        ...SUPABASE_AUTH_HEADERS(data.session?.access_token, teamId),
      },
    })

    sandboxManagerRef.current = new SandboxManager(
      storeRef.current,
      sandbox,
      rootPath,
      sandboxInfo.envdAccessToken !== undefined
    )

    trackInteraction('started_watching', {
      sandbox_id: sandboxInfo?.sandboxID,
      team_id: teamId,
      root_path: rootPath,
    })
  }, [sandboxInfo?.sandboxID, teamId, rootPath, router, trackInteraction])

  // handle sandbox connection / disconnection
  useEffect(() => {
    if (isRunning) {
      if (!sandboxManagerRef.current) {
        connectSandbox()
      }
      return
    }

    sandboxManagerRef.current?.stopWatching()

    trackInteraction('stopped_watching', {
      sandbox_id: sandboxInfo?.sandboxID,
      team_id: teamId,
      root_path: rootPath,
    })
  }, [isRunning, connectSandbox, trackInteraction])

  if (!storeRef.current || !sandboxInfo) {
    return null // should never happen, but satisfies type-checker
  }

  const contextValue: SandboxInspectContextValue = {
    store: storeRef.current,
    operations,
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
