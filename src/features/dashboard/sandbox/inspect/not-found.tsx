'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { l } from '@/lib/clients/logger/logger'
import { useSandboxInspectAnalytics } from '@/lib/hooks/use-analytics'
import { cn } from '@/lib/utils'
import { AsciiBackgroundPattern } from '@/ui/patterns'
import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { ArrowLeft, ArrowUp, Home, RefreshCw } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { serializeError } from 'serialize-error'
import { useSandboxContext } from '../context'

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

  return (
    <>
      <div className="text-fill-highlight pointer-events-none absolute -top-30 -right-100 flex overflow-hidden">
        <AsciiBackgroundPattern className="w-1/2" />
        <AsciiBackgroundPattern className="mi w-1/2 -scale-x-100" />
      </div>

      <div className="animate-fade-slide-in flex w-full items-center justify-center pt-24 max-sm:p-4">
        <Card className="border-stroke bg-bg-1/40 w-full max-w-md border backdrop-blur-lg">
          <CardHeader className="text-center">
            <CardTitle>
              {isRunning ? 'Empty Directory' : 'Not Connected'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-fg-tertiary text-center">
            <p>
              {isRunning
                ? 'This directory appears to be empty or does not exist. You can reset to the default state, navigate to root, or refresh to try again.'
                : 'It seems like the sandbox is not connected anymore. We cannot access the filesystem at this time.'}
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-1 pt-4">
            {isRunning ? (
              <>
                <div className="flex w-full gap-1">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setRootPath('')}
                    disabled={isPending && pendingPath === ''}
                  >
                    <Home />
                    Reset
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setRootPath('/')}
                    disabled={isPending && pendingPath === '/'}
                  >
                    <ArrowUp />
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
                  className="w-full"
                  disabled={isResetPending}
                >
                  <RefreshCw
                    className={cn(
                      'transition-transform',
                      {
                        'animate-spin': isResetPending,
                      }
                    )}
                  />
                  Refresh
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                onClick={() =>
                  router.push(PROTECTED_URLS.SANDBOXES(teamIdOrSlug as string))
                }
                className="w-full"
              >
                <ArrowLeft />
                Back to Sandboxes
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
