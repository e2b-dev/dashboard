'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { useSandboxInspectAnalytics } from '@/lib/hooks/use-analytics'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  HomeIcon,
  RefreshIcon,
} from '@/ui/primitives/icons'
import { useSandboxContext } from '../context'
import SandboxInspectEmptyFrame from './empty'

export default function SandboxInspectNotFound() {
  const router = useRouter()
  const { isRunning } = useSandboxContext()

  const { teamSlug } = useParams()

  const [pendingPath, setPendingPath] = useState<string | undefined>(undefined)
  const [isPending, startTransition] = useTransition()
  const [isResetPending, resetTransition] = useTransition()

  const save = async (newPath: string) => {
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
  }

  const setRootPath = useCallback(
    (newPath: string) => {
      setPendingPath(newPath)
      startTransition(async () => {
        await save(newPath)
        router.refresh()
      })
    },
    [router, startTransition]
  )

  useEffect(() => {
    if (!isPending) {
      setPendingPath(undefined)
    }
  }, [isPending])

  const description = isRunning
    ? 'This directory appears to be empty or does not exist. You can reset to the default state, navigate to root, or refresh to try again.'
    : 'It seems like the sandbox is not connected anymore. We cannot access the filesystem at this time.'

  const actions = isRunning ? (
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
  ) : (
    <Button
      variant="secondary"
      onClick={() => router.push(PROTECTED_URLS.SANDBOXES(teamSlug as string))}
      className="w-full gap-2"
    >
      <ArrowLeftIcon className="text-fg-tertiary h-4 w-4" />
      Back to Sandboxes
    </Button>
  )

  return (
    <SandboxInspectEmptyFrame
      title={isRunning ? 'Empty Directory' : 'Not Connected'}
      description={description}
      actions={actions}
    />
  )
}
