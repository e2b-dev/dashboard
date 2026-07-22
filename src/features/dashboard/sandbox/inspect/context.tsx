'use client'

import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createEnvdSandbox } from '@/core/shared/create-envd-sandbox'
import { useSandboxInspectAnalytics } from '@/lib/hooks/use-analytics'
import { getParentPath, normalizePath } from '@/lib/utils/filesystem'
import { useTRPCClient } from '@/trpc/client'
import { useSandboxContext } from '../context'
import { SANDBOX_RESUME_TIMEOUT_MS } from './constants'
import { createFilesystemStore, type FilesystemStore } from './filesystem/store'
import type { FilesystemOperations } from './filesystem/types'
import { SandboxManager } from './sandbox-manager'

interface SandboxInspectContextValue {
  store: FilesystemStore
  operations: FilesystemOperations
  isSandboxResumePending: boolean
  sandboxResumeError?: string
  resumeSandbox: () => Promise<void>
}

const SandboxInspectContext = createContext<SandboxInspectContextValue | null>(
  null
)

interface SandboxInspectProviderProps {
  children: ReactNode
  rootPath: string
}

function createStoreWithRoot(rootPath: string) {
  const normalizedRootPath = normalizePath(rootPath)
  const store = createFilesystemStore(rootPath)
  const state = store.getState()
  const rootName =
    normalizedRootPath === '/' ? '/' : normalizedRootPath.split('/').pop() || ''

  state.addNodes(getParentPath(normalizedRootPath), [
    {
      name: rootName,
      path: normalizedRootPath,
      type: 'dir',
      isExpanded: true,
      children: [],
    },
  ])
  state.setLoaded(normalizedRootPath, false)

  return store
}

export default function SandboxInspectProvider({
  children,
  rootPath,
}: SandboxInspectProviderProps) {
  const trpcClient = useTRPCClient()

  const { sandboxInfo, isRunning, refetchSandboxInfo } = useSandboxContext()
  const sandboxId = sandboxInfo?.sandboxID
  const sandboxState = sandboxInfo?.state
  const [store] = useState(() => createStoreWithRoot(rootPath))
  const sandboxManagerRef = useRef<SandboxManager | null>(null)
  const connectGenerationRef = useRef(0)
  const [isSandboxResumePending, setIsSandboxResumePending] = useState(false)
  const [sandboxResumeError, setSandboxResumeError] = useState<string>()
  const [connectionKey, setConnectionKey] = useState<string>()

  const { trackInteraction } = useSandboxInspectAnalytics()
  const normalizedRootPath = normalizePath(rootPath)
  const expectedConnectionKey =
    sandboxId && sandboxState
      ? `${sandboxId}:${normalizedRootPath}:${sandboxState}`
      : undefined

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
        const node = store.getState().getNode(path)

        if (!node) return

        if (
          isRunning &&
          node.type === 'file' &&
          !store.getState().isLoaded(path)
        ) {
          await sandboxManagerRef.current?.readFile(path)
        }

        store.getState().setSelected(path)
        if (node.type === 'file') {
          trackInteraction('selected_file', { path })
        }
      },
      resetSelected: () => {
        store.setState((state) => {
          state.selectedPath = undefined
        })
      },
      toggleDirectory: async (path: string) => {
        const normalizedPath = normalizePath(path)
        const state = store.getState()
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

        const node = store.getState().getNode(path)

        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = node?.name || ''
        a.target = '_blank'
        a.click()

        trackInteraction('downloaded_file', { path })
      },
    }),
    [isRunning, store, trackInteraction]
  )

  // Build an envd-only client from sandbox-scoped credentials and start the
  // file watcher. No control-plane call, so this never resumes a paused
  // sandbox or extends its TTL — the account token never reaches the browser.
  const buildManagerFromCreds = async (creds: {
    sandboxId: string
    sandboxDomain?: string | null
    envdVersion: string
    envdAccessToken?: string
  }) => {
    const generation = connectGenerationRef.current + 1
    connectGenerationRef.current = generation

    if (sandboxManagerRef.current) {
      sandboxManagerRef.current.stopWatching()
    }

    const sandbox = createEnvdSandbox({
      ...creds,
      domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
      sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL,
    })
    const manager = new SandboxManager(store, sandbox, rootPath)
    sandboxManagerRef.current = manager
    await manager.loadDirectory(rootPath)

    // Superseded by a newer connect/resume while loading — discard.
    if (connectGenerationRef.current !== generation) {
      manager.stopWatching()
      return false
    }
    return true
  }

  const connectSandbox = async (options?: {
    connectionKey?: string | null
  }) => {
    if (!sandboxInfo || !sandboxId) return false
    if (sandboxInfo.state === 'killed') return false

    const didConnect = await buildManagerFromCreds({
      sandboxId,
      sandboxDomain: sandboxInfo.domain,
      envdVersion: sandboxInfo.envdVersion,
      envdAccessToken: sandboxInfo.envdAccessToken,
    })
    if (!didConnect) return false

    if (options?.connectionKey !== null) {
      setConnectionKey(options?.connectionKey ?? expectedConnectionKey)
    }

    trackInteraction('started_watching', {
      sandbox_id: sandboxId,
      root_path: rootPath,
    })
    return true
  }

  useQuery({
    queryKey: ['sandbox-inspect-connect', expectedConnectionKey],
    queryFn: () => {
      if (!isRunning) {
        connectGenerationRef.current += 1
        sandboxManagerRef.current?.stopWatching()
        sandboxManagerRef.current = null
        setConnectionKey(expectedConnectionKey)
        return false
      }

      return connectSandbox({ connectionKey: expectedConnectionKey })
    },
    enabled: Boolean(
      expectedConnectionKey &&
        connectionKey !== expectedConnectionKey &&
        !isSandboxResumePending
    ),
    retry: false,
    refetchOnMount: 'always',
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  })

  // Explicit, user-triggered resume. The control-plane connect (resume + TTL)
  // happens server-side via the `sandbox.resume` mutation; we then rebuild the
  // envd-only client from the returned sandbox-scoped credentials.
  const resumeSandbox = async () => {
    if (!sandboxId) return
    setSandboxResumeError(undefined)
    setIsSandboxResumePending(true)
    try {
      const creds = await trpcClient.sandbox.resume.mutate({
        sandboxId,
        requestTimeoutMs: SANDBOX_RESUME_TIMEOUT_MS,
      })

      const didConnect = await buildManagerFromCreds(creds)
      if (!didConnect) {
        setSandboxResumeError('Failed to resume sandbox. Please try again.')
        setIsSandboxResumePending(false)
        return
      }

      const nextSandboxInfo = await refetchSandboxInfo()
      if (nextSandboxInfo?.state === 'running') {
        setConnectionKey(
          `${nextSandboxInfo.sandboxID}:${normalizedRootPath}:${nextSandboxInfo.state}`
        )
      }
      setIsSandboxResumePending(false)
    } catch (error) {
      setSandboxResumeError(
        error instanceof Error
          ? error.message
          : 'Failed to resume sandbox. Please try again.'
      )
      setIsSandboxResumePending(false)
    }
  }

  useEffect(() => {
    return () => {
      connectGenerationRef.current += 1
      sandboxManagerRef.current?.stopWatching()
      sandboxManagerRef.current = null
    }
  }, [])

  if (!sandboxInfo) {
    return null // should never happen, but satisfies type-checker
  }

  const contextValue: SandboxInspectContextValue = {
    store,
    operations,
    isSandboxResumePending,
    sandboxResumeError,
    resumeSandbox,
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
