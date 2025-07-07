'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { RefreshCw, Home, ArrowUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'

export default function SandboxInspectNotFound() {
  const router = useRouter()
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
    } catch {
      // ignore
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
    <div className="animate-fade-slide-in flex w-full items-center justify-center pt-24 max-sm:p-4">
      <Card className="border-border bg-bg-100/40 w-full max-w-md border backdrop-blur-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-light">Empty Directory</CardTitle>
        </CardHeader>
        <CardContent className="text-fg-500 text-center">
          <p>
            This directory appears to be empty or does not exist. You can reset
            to the default state, navigate to root, or refresh to try again.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-4">
          <div className="flex w-full justify-between gap-4">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => setRootPath('')}
              disabled={isPending && pendingPath === ''}
            >
              <Home className="text-fg-500 h-4 w-4" />
              Reset
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => setRootPath('/')}
              disabled={isPending && pendingPath === '/'}
            >
              <ArrowUp className="text-fg-500 h-4 w-4" />
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
              className={cn('text-fg-500 h-4 w-4 transition-transform', {
                'animate-spin': isResetPending,
              })}
            />
            Refresh
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
