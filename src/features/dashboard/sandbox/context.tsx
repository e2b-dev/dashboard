'use client'

import { useQuery } from '@tanstack/react-query'
import Sandbox from 'e2b'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { authHeaders } from '@/configs/api'
import { SANDBOXES_METRICS_POLLING_MS } from '@/configs/intervals'
import { AUTH_URLS } from '@/configs/urls'
import type {
  SandboxDetailsModel,
  SandboxEventModel,
} from '@/core/modules/sandboxes/models'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { supabase } from '@/core/shared/clients/supabase/client'
import { useDashboard } from '@/features/dashboard/context'
import { useAlignedRefetchInterval } from '@/lib/hooks/use-aligned-refetch-interval'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { isNotFoundError } from '@/lib/utils/trpc-errors'
import { useTRPC } from '@/trpc/client'
import { SANDBOX_LIFECYCLE_EVENT_KILLED } from './monitoring/utils/constants'

const SANDBOX_RESUME_TIMEOUT_MS = 5 * 60 * 1000

interface GetSandboxOptions {
  requestTimeoutMs?: number
  timeoutMs?: number
}

export interface SandboxLifecycleState {
  createdAt: string | null
  pausedAt: string | null
  endedAt: string | null
  events: SandboxEventModel[]
}

interface SandboxContextValue {
  sandboxInfo?: SandboxDetailsModel
  sandboxLifecycle: SandboxLifecycleState | null
  isRunning: boolean
  isSandboxNotFound: boolean

  isSandboxInfoLoading: boolean
  isSandboxResumePending: boolean
  getSandbox: () => Promise<Sandbox>
  refetchSandboxInfo: () => Promise<void>
  resumeSandbox: () => Promise<void>
}

const SandboxContext = createContext<SandboxContextValue | null>(null)

export function useSandboxContext() {
  const context = useContext(SandboxContext)
  if (!context) {
    throw new Error('useSandboxContext must be used within a SandboxProvider')
  }
  return context
}

interface SandboxProviderProps {
  children: ReactNode
}

function buildSandboxLifecycle(
  sandboxInfo: SandboxDetailsModel | undefined
): SandboxLifecycleState | null {
  if (!sandboxInfo) {
    return null
  }

  const fallbackPausedAt =
    sandboxInfo.state === 'paused' ? sandboxInfo.endAt : null
  const fallbackEndedAt =
    sandboxInfo.state === 'killed'
      ? (sandboxInfo.stoppedAt ?? sandboxInfo.endAt)
      : null

  return {
    createdAt: sandboxInfo.lifecycle?.createdAt ?? sandboxInfo.startedAt,
    pausedAt: sandboxInfo.lifecycle?.pausedAt ?? fallbackPausedAt,
    endedAt: sandboxInfo.lifecycle?.endedAt ?? fallbackEndedAt,
    events: sandboxInfo.lifecycle?.events ?? [],
  }
}

export function SandboxProvider({ children }: SandboxProviderProps) {
  const router = useRouter()
  const { team } = useDashboard()
  const { teamSlug, sandboxId } =
    useRouteParams<'/dashboard/[teamSlug]/sandboxes/[sandboxId]'>()
  const [isSandboxResumePending, setIsSandboxResumePending] = useState(false)
  const sandboxRef = useRef<Sandbox | null>(null)
  const sandboxPromiseRef = useRef<Promise<Sandbox> | null>(null)
  const sandboxConnectionKey = `${team.id}:${sandboxId}`
  const sandboxConnectionKeyRef = useRef(sandboxConnectionKey)

  const trpc = useTRPC()
  const getAlignedRefetchInterval = useAlignedRefetchInterval({
    intervalMs: SANDBOXES_METRICS_POLLING_MS,
  })

  const {
    data: sandboxInfoData,
    error: sandboxInfoError,
    isLoading: isSandboxInfoLoading,
    isFetching: isSandboxInfoFetching,
    refetch,
  } = useQuery(
    trpc.sandbox.details.queryOptions(
      { teamSlug, sandboxId },
      {
        retry: false,
        refetchInterval: (query) => {
          const sandboxInfo = query.state.data as
            | SandboxDetailsModel
            | undefined
          const state = sandboxInfo?.state

          // Keep polling when killed but the killed lifecycle event hasn't
          // been received yet, so the monitoring chart can capture final data.
          const isAwaitingKilledEvent =
            state === 'killed' &&
            !sandboxInfo?.lifecycle?.events?.some(
              (e) => e.type === SANDBOX_LIFECYCLE_EVENT_KILLED
            )
          const shouldPoll =
            state === 'running' || state === 'paused' || isAwaitingKilledEvent

          return getAlignedRefetchInterval(shouldPoll)
        },
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        staleTime: Number.POSITIVE_INFINITY,
      }
    )
  )

  const sandboxState = sandboxInfoData?.state

  const refetchSandboxInfo = useCallback(async () => {
    await refetch()
  }, [refetch])

  useEffect(() => {
    sandboxConnectionKeyRef.current = sandboxConnectionKey
    sandboxRef.current = null
    sandboxPromiseRef.current = null
  }, [sandboxConnectionKey])

  useEffect(() => {
    if (sandboxState === 'running') return

    sandboxRef.current = null
    sandboxPromiseRef.current = null
  }, [sandboxState])

  const connectSandbox = useCallback(
    async (options: GetSandboxOptions = {}) => {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        router.replace(AUTH_URLS.SIGN_IN)
        throw new Error('You need to sign in before connecting to sandbox.')
      }

      const connectionKey = sandboxConnectionKey

      const sandbox = await Sandbox.connect(sandboxId, {
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        timeoutMs: options.timeoutMs,
        requestTimeoutMs: options.requestTimeoutMs,
        headers: authHeaders(data.session.access_token, team.id),
      })

      if (sandboxConnectionKeyRef.current !== connectionKey) {
        throw new Error('Sandbox connection was superseded.')
      }

      return sandbox
    },
    [router, sandboxConnectionKey, sandboxId, team.id]
  )

  const getSandbox = useCallback(async () => {
    if (sandboxRef.current) {
      return sandboxRef.current
    }

    if (!sandboxPromiseRef.current) {
      sandboxPromiseRef.current = connectSandbox({
        // Keep page-scoped connections from extending sandbox TTL via SDK default connect timeout.
        timeoutMs: 1_000,
      })
        .then((sandbox) => {
          sandboxRef.current = sandbox
          return sandbox
        })
        .finally(() => {
          sandboxPromiseRef.current = null
        })
    }

    return sandboxPromiseRef.current
  }, [connectSandbox])

  const resumeSandbox = useCallback(async () => {
    setIsSandboxResumePending(true)
    try {
      sandboxRef.current = null
      sandboxPromiseRef.current = null

      const sandbox = await connectSandbox({
        timeoutMs: SANDBOX_RESUME_TIMEOUT_MS,
      })
      sandboxRef.current = sandbox

      await refetch()
    } catch (error) {
      l.error(
        {
          key: 'sandbox_context:resume_failed',
          error: serializeErrorForLog(error),
          sandbox_id: sandboxId,
        },
        `${error instanceof Error ? error.message : 'Failed to resume sandbox'}`
      )
    } finally {
      setIsSandboxResumePending(false)
    }
  }, [connectSandbox, refetch, sandboxId])

  const isRunning = sandboxState === 'running'

  const isSandboxNotFound =
    !sandboxInfoData && isNotFoundError(sandboxInfoError)

  const isSandboxInfoPending = isSandboxInfoLoading || isSandboxInfoFetching
  const sandboxLifecycle = useMemo(
    () => buildSandboxLifecycle(sandboxInfoData),
    [sandboxInfoData]
  )

  return (
    <SandboxContext.Provider
      value={{
        sandboxInfo: sandboxInfoData,
        sandboxLifecycle,
        isRunning,
        isSandboxNotFound,
        isSandboxInfoLoading: isSandboxInfoPending,
        isSandboxResumePending,
        getSandbox,
        refetchSandboxInfo,
        resumeSandbox,
      }}
    >
      {children}
    </SandboxContext.Provider>
  )
}
