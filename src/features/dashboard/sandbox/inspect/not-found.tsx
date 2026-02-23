'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { l } from '@/lib/clients/logger/logger'
import { useSandboxInspectAnalytics } from '@/lib/hooks/use-analytics'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import { ArrowLeft, ArrowUp, Home, RefreshCw } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { serializeError } from 'serialize-error'
import { useSandboxContext } from '../context'
import SandboxInspectEmptyFrame from './empty'

export default function SandboxInspectNotFound() {
  const router = useRouter()
  const { isRunning } = useSandboxContext()
  const { trackInteraction } = useSandboxInspectAnalytics()

  const { teamIdOrSlug } = useParams()

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
          error: serializeError(error),
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
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => setRootPath('')}
          disabled={isPending && pendingPath === ''}
        >
          <Home className="text-fg-tertiary h-4 w-4" />
          Reset
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => setRootPath('/')}
          disabled={isPending && pendingPath === '/'}
        >
          <ArrowUp className="text-fg-tertiary h-4 w-4" />
          To Root
        </Button>
      </div>
      <Button
        variant="outline"
        onClick={() =>
          resetTransition(async () => {
            router.refresh()
          })
        }
        className="w-full gap-2"
        disabled={isResetPending}
      >
        <RefreshCw
          className={cn('text-fg-tertiary h-4 w-4 transition-transform', {
            'animate-spin': isResetPending,
          })}
        />
        Refresh
      </Button>
    </>
  ) : (
    <Button
      variant="outline"
      onClick={() =>
        router.push(PROTECTED_URLS.SANDBOXES(teamIdOrSlug as string))
      }
      className="w-full gap-2"
    >
      <ArrowLeft className="text-fg-tertiary h-4 w-4" />
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
