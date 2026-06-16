'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { COOKIE_KEYS } from '@/configs/cookies'
import { PROTECTED_URLS } from '@/configs/urls'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { cn } from '@/lib/utils'
import { setBrowserCookie } from '@/lib/utils/browser-cookies'
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
  isResumePending?: boolean
  onResumeSandbox?: () => void
  resource?: 'filesystem' | 'terminal'
  resumeError?: string
}

export default function SandboxInspectNotFound({
  isResumePending = false,
  onResumeSandbox,
  resource = 'filesystem',
  resumeError,
}: SandboxInspectNotFoundProps) {
  const router = useRouter()
  const { isRunning, sandboxInfo } = useSandboxContext()

  const { teamSlug } = useParams()

  const [pendingPath, setPendingPath] = useState<string | undefined>(undefined)
  const [isPending, startTransition] = useTransition()
  const [isResetPending, resetTransition] = useTransition()

  const save = useCallback((newPath: string) => {
    try {
      setBrowserCookie(COOKIE_KEYS.SANDBOX_INSPECT_ROOT_PATH, newPath)
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
      startTransition(() => {
        save(newPath)
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

  const isFilesystem = resource === 'filesystem'
  const isPaused = sandboxInfo?.state === 'paused'
  const resourceName = isFilesystem ? 'filesystem' : 'terminal'
  const description =
    isRunning && isFilesystem
      ? 'This directory appears to be empty or does not exist. You can reset to the default state, navigate to root, or refresh to try again.'
      : isRunning
        ? 'The terminal is unavailable right now. Refresh to try again.'
        : resumeError
          ? resumeError
          : isPaused
            ? `Resume this sandbox to access the ${resourceName}.`
            : `It seems like the sandbox is not connected anymore. We cannot access the ${resourceName} at this time.`

  const actions =
    isRunning && isFilesystem ? (
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
    ) : isRunning ? (
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
    ) : isPaused && onResumeSandbox ? (
      <Button
        className="w-full gap-2"
        onClick={onResumeSandbox}
        disabled={isResumePending}
      >
        <RunningIcon className="h-4 w-4" />
        Resume sandbox
      </Button>
    ) : (
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
      actions={actions}
    />
  )
}
