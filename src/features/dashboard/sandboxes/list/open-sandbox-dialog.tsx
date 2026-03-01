'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { SandboxIdSchema } from '@/lib/schemas/api'
import type { TRPCAppRouter } from '@/server/api/routers'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import { Input } from '@/ui/primitives/input'
import { useQueryClient } from '@tanstack/react-query'
import { TRPCClientError, type TRPCClientErrorLike } from '@trpc/client'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { SANDBOX_RECORD_RETENTION_DAYS } from './constants'

type LookupState = 'idle' | 'not-found' | 'error'

function isNotFoundError(
  error: unknown
): error is
  | TRPCClientErrorLike<TRPCAppRouter>
  | TRPCClientError<TRPCAppRouter> {
  if (error instanceof TRPCClientError) {
    return error.data?.code === 'NOT_FOUND'
  }

  if (typeof error !== 'object' || error === null) {
    return false
  }

  const trpcLikeError = error as {
    data?: { code?: string }
    shape?: { data?: { code?: string } }
  }

  return (
    trpcLikeError.data?.code === 'NOT_FOUND' ||
    trpcLikeError.shape?.data?.code === 'NOT_FOUND'
  )
}

export function OpenSandboxDialog() {
  'use no memo'

  const { teamIdOrSlug } =
    useRouteParams<'/dashboard/[teamIdOrSlug]/sandboxes'>()

  const router = useRouter()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [sandboxIdInput, setSandboxIdInput] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [lookupState, setLookupState] = useState<LookupState>('idle')
  const [isChecking, setIsChecking] = useState(false)

  const resetState = () => {
    setSandboxIdInput('')
    setValidationError(null)
    setLookupState('idle')
    setIsChecking(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetState()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const sandboxId = sandboxIdInput.trim()
    const parsedSandboxId = SandboxIdSchema.safeParse(sandboxId)
    if (!parsedSandboxId.success) {
      const message =
        parsedSandboxId.error.issues[0]?.message ?? 'Invalid sandbox ID'
      setValidationError(message)
      setLookupState('idle')
      return
    }

    setValidationError(null)
    setIsChecking(true)

    try {
      await queryClient.fetchQuery(
        trpc.sandbox.details.queryOptions(
          { teamIdOrSlug, sandboxId },
          {
            retry: false,
          }
        )
      )
      router.push(PROTECTED_URLS.SANDBOX(teamIdOrSlug, sandboxId))
      setOpen(false)
      resetState()
    } catch (error) {
      setLookupState(isNotFoundError(error) ? 'not-found' : 'error')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="md">Inspect a Sandbox</Button>
      </DialogTrigger>

      <DialogContent className="max-w-[500px] max-h-[calc(100svh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Open Sandbox Details</DialogTitle>
          <DialogDescription>
            Open details for any Sandbox by ID, including ones not visible in
            the current list. Historical Sandbox records are retained for up to{' '}
            {SANDBOX_RECORD_RETENTION_DAYS} days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-w-0">
          <div className="flex min-w-0 flex-col gap-4 pb-2">
            <div className="flex flex-col gap-2">
              <span className="prose-label text-fg-tertiary uppercase">
                Sandbox ID
              </span>
              <Input
                value={sandboxIdInput}
                onChange={(event) => {
                  setSandboxIdInput(event.target.value)
                  if (validationError) {
                    setValidationError(null)
                  }
                  if (lookupState !== 'idle') {
                    setLookupState('idle')
                  }
                }}
                placeholder="Insert Sandbox ID"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {validationError && (
              <p className="prose-body text-accent-error-highlight">
                {validationError}
              </p>
            )}
            {lookupState === 'not-found' && (
              <p className="prose-body text-accent-error-highlight">
                No sandbox details found for this ID.
              </p>
            )}
            {lookupState === 'error' && (
              <p className="prose-body text-accent-error-highlight">
                Failed to check sandbox details. Please try again.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              variant="outline"
              loading={isChecking}
              className="w-full sm:w-auto"
            >
              Open Details
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
