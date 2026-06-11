'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
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

interface SandboxInspectNotFoundProps {
  resource?: 'filesystem' | 'terminal'
}

export default function SandboxInspectNotFound({
  resource = 'filesystem',
}: SandboxInspectNotFoundProps) {
  const router = useRouter()
  const { isRunning, sandboxInfo } = useSandboxContext()

  const { teamSlug } = useParams()

  const [pendingPath, setPendingPath] = useState<string | undefined>(undefined)
  const [isPending, startTransition] = useTransition()

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

  useEffect(() => {
    if (!isPending) {
      setPendingPath(undefined)
    }
  }, [isPending])

  const isPaused = sandboxInfo?.state === 'paused'
  const resourceName = resource === 'terminal' ? 'terminal' : 'filesystem'
  const isFilesystem = resource === 'filesystem'

  const description =
    isRunning && isFilesystem
      ? 'This directory appears to be empty or does not exist. You can reset to the default state, navigate to root, or refresh to try again.'
      : isRunning
        ? 'The terminal is unavailable right now. Refresh to try again.'
        : isPaused
          ? `Resume this sandbox to access the ${resourceName}.`
          : `It seems like the sandbox is not connected anymore. We cannot access the ${resourceName} at this time.`

  return (
    <SandboxInspectEmptyFrame
      title={
        isRunning && isFilesystem
          ? 'Empty Directory'
          : isRunning
            ? 'Terminal Unavailable'
            : isPaused
              ? 'Sandbox Paused'
              : 'Not Connected'
      }
      description={description}
      actions={
        <SandboxInspectNotFoundActions
          isFilesystem={isFilesystem}
          isPaused={isPaused}
          isPending={isPending}
          isRunning={isRunning}
          pendingPath={pendingPath}
          setRootPath={setRootPath}
          teamSlug={teamSlug as string}
        />
      }
    />
  )
}

function SandboxInspectNotFoundActions({
  isFilesystem,
  isPaused,
  isPending,
  isRunning,
  pendingPath,
  setRootPath,
  teamSlug,
}: {
  isFilesystem: boolean
  isPaused: boolean
  isPending: boolean
  isRunning: boolean
  pendingPath?: string
  setRootPath: (newPath: string) => void
  teamSlug: string
}) {
  const router = useRouter()
  const { isSandboxResumePending, resumeSandbox } = useSandboxContext()
  const [isResetPending, resetTransition] = useTransition()

  if (isRunning && isFilesystem) {
    return (
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
        <SandboxInspectRefreshButton
          isResetPending={isResetPending}
          onRefresh={() =>
            resetTransition(async () => {
              router.refresh()
            })
          }
        />
      </>
    )
  }

  if (isRunning) {
    return (
      <SandboxInspectRefreshButton
        isResetPending={isResetPending}
        onRefresh={() =>
          resetTransition(async () => {
            router.refresh()
          })
        }
      />
    )
  }

  if (isPaused) {
    return (
      <Button
        className="w-full gap-2"
        onClick={() => void resumeSandbox()}
        disabled={isSandboxResumePending}
      >
        <RunningIcon className="h-4 w-4" />
        Resume sandbox
      </Button>
    )
  }

  return (
    <Button
      variant="secondary"
      onClick={() => router.push(PROTECTED_URLS.SANDBOXES(teamSlug))}
      className="w-full gap-2"
    >
      <ArrowLeftIcon className="text-fg-tertiary h-4 w-4" />
      Back to Sandboxes
    </Button>
  )
}

function SandboxInspectRefreshButton({
  isResetPending,
  onRefresh,
}: {
  isResetPending: boolean
  onRefresh: () => void
}) {
  return (
    <Button
      variant="secondary"
      onClick={onRefresh}
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
  )
}
