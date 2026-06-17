'use client'

import { useQuery } from '@tanstack/react-query'
import Sandbox from 'e2b'
import type { ReactNode } from 'react'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { SandboxManagementAuth } from '@/core/shared/sandbox-management-auth'
import { useSandboxInspectAnalytics } from '@/lib/hooks/use-analytics'
import { getParentPath, normalizePath } from '@/lib/utils/filesystem'
import { useDashboard } from '../../context'
import { useSandboxContext } from '../context'
import { createFilesystemStore, type FilesystemStore } from './filesystem/store'
import type { FilesystemOperations } from './filesystem/types'
import { SandboxManager } from './sandbox-manager'

const SANDBOX_RESUME_TIMEOUT_MS = 70_000

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
  sandboxManagementAuth: SandboxManagementAuth
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
  sandboxManagementAuth,
}: SandboxInspectProviderProps) {
  const { team } = useDashboard()
  const teamId = team.id

  const { sandboxInfo, isRunning, refetchSandboxInfo } = useSandboxContext()
  const sandboxId = sandboxInfo?.sandboxID
  const sandboxState = sandboxInfo?.state
  const [store] = useState(() => createStoreWithRoot(rootPath))
  const sandboxManagerRef = useRef<SandboxManager | null>(null)
  const connectGenerationRef = useRef(0)
  const connectAbortControllerRef = useRef<AbortController | null>(null)
  const [isSandboxResumePending, setIsSandboxResumePending] = useState(false)
  const [sandboxResumeError, setSandboxResumeError] = useState<string>()
  const [connectionKey, setConnectionKey] = useState<string>()

  const { trackInteraction } = useSandboxInspectAnalytics()
  const normalizedRootPath = normalizePath(rootPath)
  const expectedConnectionKey =
    sandboxId && teamId && sandboxState
      ? `${teamId}:${sandboxId}:${normalizedRootPath}:${sandboxState}`
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

  const connectSandbox = async (options?: {
    connectionKey?: string | null
    requestTimeoutMs?: number
    timeoutMs?: number
  }) => {
    if (!sandboxId || !teamId) return false
    const generation = connectGenerationRef.current + 1
    connectGenerationRef.current = generation
    connectAbortControllerRef.current?.abort()
    const abortController = new AbortController()
    connectAbortControllerRef.current = abortController

    // (re)create the sandbox-manager when sandbox / team / root changes
    if (sandboxManagerRef.current) {
      sandboxManagerRef.current.stopWatching()
    }

    const sandbox = await Sandbox.connect(sandboxId, {
      domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
      // Keep inspect connections from extending sandbox TTL via SDK default connect timeout.
      timeoutMs: options?.timeoutMs ?? 1_000,
      requestTimeoutMs: options?.requestTimeoutMs,
      signal: abortController.signal,
      apiHeaders: {
        ...sandboxManagementAuth.headers,
      },
    })

    if (connectGenerationRef.current !== generation) {
      if (connectAbortControllerRef.current === abortController) {
        connectAbortControllerRef.current = null
      }
      return false
    }

    connectAbortControllerRef.current = null
    sandboxManagerRef.current = new SandboxManager(store, sandbox, rootPath)
    await sandboxManagerRef.current.loadDirectory(rootPath)
    if (options?.connectionKey !== null) {
      setConnectionKey(options?.connectionKey ?? expectedConnectionKey)
    }

    trackInteraction('started_watching', {
      sandbox_id: sandboxId,
      team_id: teamId,
      root_path: rootPath,
    })
    return true
  }

  useQuery({
    queryKey: ['sandbox-inspect-connect', expectedConnectionKey],
    queryFn: () => {
      if (!isRunning) {
        connectGenerationRef.current += 1
        connectAbortControllerRef.current?.abort()
        connectAbortControllerRef.current = null
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

  const resumeSandbox = async () => {
    setSandboxResumeError(undefined)
    setIsSandboxResumePending(true)
    try {
      const didConnect = await connectSandbox({
        connectionKey: null,
        requestTimeoutMs: SANDBOX_RESUME_TIMEOUT_MS,
        timeoutMs: SANDBOX_RESUME_TIMEOUT_MS,
      })
      if (!didConnect) {
        setSandboxResumeError('Failed to resume sandbox. Please try again.')
        setIsSandboxResumePending(false)
        return
      }
      const nextSandboxInfo = await refetchSandboxInfo()
      if (nextSandboxInfo?.state === 'running') {
        setConnectionKey(
          `${teamId}:${nextSandboxInfo.sandboxID}:${normalizedRootPath}:${nextSandboxInfo.state}`
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
      connectAbortControllerRef.current?.abort()
      connectAbortControllerRef.current = null
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
