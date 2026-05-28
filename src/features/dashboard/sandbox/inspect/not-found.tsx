'use client'

import Sandbox from 'e2b'
import { useParams, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { supabase } from '@/core/shared/clients/supabase/client'
import { useDashboard } from '@/features/dashboard/context'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  HomeIcon,
  RefreshIcon,
  RunningIcon,
} from '@/ui/primitives/icons'
import { useSandboxContext } from '../context'
import SandboxInspectEmptyFrame from './empty'

const SANDBOX_RESUME_TIMEOUT_MS = 5 * 60 * 1000

interface SandboxInspectNotFoundProps {
  onResumeSandbox?: () => void
  resource?: 'filesystem' | 'terminal'
}

export default function SandboxInspectNotFound({
  onResumeSandbox,
  resource = 'filesystem',
}: SandboxInspectNotFoundProps) {
  const router = useRouter()
  const { team } = useDashboard()
  const { isRunning, sandboxInfo, refetchSandboxInfo } = useSandboxContext()

  const { teamSlug } = useParams()

  const [pendingPath, setPendingPath] = useState<string | undefined>(undefined)
  const [isResumePending, setIsResumePending] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isResetPending, resetTransition] = useTransition()

  const save = useCallback(async (newPath: string) => {
    try {
      await fetch('/api/sandbox/inspect/root-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath }),
      })
    } catch (error) {
      l.error(
        {
          key: 'sandbox_inspect_not_found:save_root_path_failed',
          error: serializeErrorForLog(error),
        },
        `${error instanceof Error ? error.message : 'Failed to save root path'}`
      )
    }
  }, [])

  const setRootPath = useCallback(
    (newPath: string) => {
      setPendingPath(newPath)
      startTransition(async () => {
        await save(newPath)
        router.refresh()
      })
    },
    [router, save]
  )

  const resumeSandbox = useCallback(async () => {
    if (onResumeSandbox) {
      onResumeSandbox()
      return
    }

    if (!sandboxInfo) return

    setIsResumePending(true)
    try {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        router.replace(AUTH_URLS.SIGN_IN)
        return
      }

      await Sandbox.connect(sandboxInfo.sandboxID, {
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        timeoutMs: SANDBOX_RESUME_TIMEOUT_MS,
        headers: {
          ...SUPABASE_AUTH_HEADERS(data.session.access_token, team.id),
        },
      })

      await refetchSandboxInfo()
    } catch (error) {
      l.error(
        {
          key: 'sandbox_inspect_not_found:resume_failed',
          error: serializeErrorForLog(error),
          sandbox_id: sandboxInfo.sandboxID,
        },
        `${error instanceof Error ? error.message : 'Failed to resume sandbox'}`
      )
    } finally {
      setIsResumePending(false)
    }
  }, [onResumeSandbox, refetchSandboxInfo, router, sandboxInfo, team.id])

  useEffect(() => {
    if (!isPending) {
      setPendingPath(undefined)
    }
  }, [isPending])

  const isPaused = sandboxInfo?.state === 'paused'
  const resourceName = resource === 'terminal' ? 'terminal' : 'filesystem'

  const description = isRunning
    ? 'This directory appears to be empty or does not exist. You can reset to the default state, navigate to root, or refresh to try again.'
    : isPaused
      ? `Resume this sandbox to access the ${resourceName}.`
      : `It seems like the sandbox is not connected anymore. We cannot access the ${resourceName} at this time.`

  let actions: ReactNode

  if (isRunning) {
    actions = (
      <>
        <div className="flex w-full justify-between gap-4">
          <Button
            variant="secondary"
            className="flex-1 gap-2"
            onClick={() => setRootPath('')}
            disabled={isPending && pendingPath === ''}
          >
            <HomeIcon className="text-fg-tertiary h-4 w-4" />
            Reset
          </Button>
          <Button
            variant="secondary"
            className="flex-1 gap-2"
            onClick={() => setRootPath('/')}
            disabled={isPending && pendingPath === '/'}
          >
            <ArrowUpIcon className="text-fg-tertiary h-4 w-4" />
            To Root
          </Button>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            resetTransition(async () => {
              router.refresh()
            })
          }
          className="w-full gap-2"
          disabled={isResetPending}
        >
          <RefreshIcon
            className={cn('text-fg-tertiary h-4 w-4 transition-transform', {
              'animate-spin': isResetPending,
            })}
          />
          Refresh
        </Button>
      </>
    )
  } else if (isPaused) {
    actions = (
      <Button
        className="w-full gap-2"
        onClick={resumeSandbox}
        disabled={isResumePending}
      >
        <RunningIcon className="h-4 w-4" />
        Resume sandbox
      </Button>
    )
  } else {
    actions = (
      <Button
        variant="secondary"
        onClick={() =>
          router.push(PROTECTED_URLS.SANDBOXES(teamSlug as string))
        }
        className="w-full gap-2"
      >
        <ArrowLeftIcon className="text-fg-tertiary h-4 w-4" />
        Back to Sandboxes
      </Button>
    )
  }

  return (
    <SandboxInspectEmptyFrame
      title={
        isRunning
          ? 'Empty Directory'
          : isPaused
            ? 'Sandbox Paused'
            : 'Not Connected'
      }
      description={description}
      actions={actions}
    />
  )
}
