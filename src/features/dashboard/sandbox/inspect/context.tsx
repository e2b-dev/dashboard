'use client'

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

export default function SandboxInspectProvider({
  children,
  rootPath,
  sandboxManagementAuth,
}: SandboxInspectProviderProps) {
  const { team } = useDashboard()
  const teamId = team.id

  const { sandboxInfo, isRunning, refetchSandboxInfo } = useSandboxContext()
  const sandboxId = sandboxInfo?.sandboxID
  const storeRef = useRef<FilesystemStore | null>(null)
  const sandboxManagerRef = useRef<SandboxManager | null>(null)
  const connectGenerationRef = useRef(0)
  const connectAbortControllerRef = useRef<AbortController | null>(null)
  const [isSandboxResumePending, setIsSandboxResumePending] = useState(false)
  const [sandboxResumeError, setSandboxResumeError] = useState<string>()

  const { trackInteraction } = useSandboxInspectAnalytics()

  // ---------- synchronous store initialisation ----------
  {
    const normalizedRoot = normalizePath(rootPath)
    const needsNewStore =
      !storeRef.current ||
      storeRef.current.getState().rootPath !== normalizedRoot

    if (needsNewStore) {
      trackInteraction('initialized', {
        sandbox_id: sandboxId,
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

  const connectSandbox = async (options?: {
    requestTimeoutMs?: number
    timeoutMs?: number
  }) => {
    if (!storeRef.current || !sandboxId || !teamId) return false
    const generation = connectGenerationRef.current + 1
    connectGenerationRef.current = generation
    const store = storeRef.current
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

    if (
      connectGenerationRef.current !== generation ||
      storeRef.current !== store
    ) {
      if (connectAbortControllerRef.current === abortController) {
        connectAbortControllerRef.current = null
      }
      return false
    }

    connectAbortControllerRef.current = null
    sandboxManagerRef.current = new SandboxManager(store, sandbox, rootPath)
    await sandboxManagerRef.current.loadDirectory(rootPath)

    trackInteraction('started_watching', {
      sandbox_id: sandboxId,
      team_id: teamId,
      root_path: rootPath,
    })
    return true
  }

  const resumeSandbox = async () => {
    setSandboxResumeError(undefined)
    setIsSandboxResumePending(true)
    try {
      const didConnect = await connectSandbox({
        requestTimeoutMs: SANDBOX_RESUME_TIMEOUT_MS,
        timeoutMs: SANDBOX_RESUME_TIMEOUT_MS,
      })
      if (!didConnect) {
        setSandboxResumeError('Failed to resume sandbox. Please try again.')
        setIsSandboxResumePending(false)
        return
      }
      await refetchSandboxInfo()
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

  // handle sandbox connection / disconnection
  useEffect(() => {
    if (isRunning) {
      if (!sandboxManagerRef.current) {
        connectSandbox()
      }
      return
    }

    connectGenerationRef.current += 1
    connectAbortControllerRef.current?.abort()
    connectAbortControllerRef.current = null
    sandboxManagerRef.current?.stopWatching()
    sandboxManagerRef.current = null

    trackInteraction('stopped_watching', {
      sandbox_id: sandboxId,
      team_id: teamId,
      root_path: rootPath,
    })
  }, [isRunning, trackInteraction, teamId, sandboxId, rootPath])

  if (!storeRef.current || !sandboxInfo) {
    return null // should never happen, but satisfies type-checker
  }

  const contextValue: SandboxInspectContextValue = {
    store: storeRef.current,
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
