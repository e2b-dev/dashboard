'use client'

import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { createEnvdSandbox } from '@/core/shared/create-envd-sandbox'
import { useSandboxInspectAnalytics } from '@/lib/hooks/use-analytics'
import { getParentPath, normalizePath } from '@/lib/utils/filesystem'
import { useDashboard } from '../../context'
import { useSandboxContext } from '../context'
import { createFilesystemStore, type FilesystemStore } from './filesystem/store'
import type { FilesystemOperations } from './filesystem/types'
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
}

export default function SandboxInspectProvider({
  children,
  rootPath,
}: SandboxInspectProviderProps) {
  const { team } = useDashboard()
  const teamId = team.id

  const { sandboxInfo, isRunning } = useSandboxContext()
  const storeRef = useRef<FilesystemStore | null>(null)
  const sandboxManagerRef = useRef<SandboxManager | null>(null)

  const { trackInteraction } = useSandboxInspectAnalytics()

  // ---------- synchronous store initialisation ----------
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

      state.setLoaded(normalizedRoot, false)
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
    [isRunning, trackInteraction]
  )

  const connectSandbox = useCallback(async () => {
    if (!storeRef.current || !sandboxInfo || !teamId) return

    // Build an envd-only client from the sandbox-scoped credentials already
    // provided by the `sandbox.details` query. No account-level access token
    // ever reaches the browser, and no control-plane call is made here (the
    // sandbox is already running — inspect only connects when `isRunning`).
    if (sandboxInfo.state === 'killed') return
    if (!sandboxInfo.envdAccessToken || !sandboxInfo.domain) return

    // (re)create the sandbox-manager when sandbox / team / root changes
    if (sandboxManagerRef.current) {
      sandboxManagerRef.current.stopWatching()
    }

    const sandbox = createEnvdSandbox({
      sandboxId: sandboxInfo.sandboxID,
      sandboxDomain: sandboxInfo.domain,
      envdAccessToken: sandboxInfo.envdAccessToken,
      envdVersion: sandboxInfo.envdVersion,
      domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
    })

    sandboxManagerRef.current = new SandboxManager(
      storeRef.current,
      sandbox,
      rootPath
    )
    await sandboxManagerRef.current.loadDirectory(rootPath)

    trackInteraction('started_watching', {
      sandbox_id: sandboxInfo?.sandboxID,
      team_id: teamId,
      root_path: rootPath,
    })
  }, [sandboxInfo, teamId, rootPath, trackInteraction])

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
  }, [
    isRunning,
    connectSandbox,
    trackInteraction,
    teamId,
    sandboxInfo?.sandboxID,
    rootPath,
  ])

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
