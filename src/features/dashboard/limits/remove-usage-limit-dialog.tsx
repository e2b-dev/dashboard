'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { BillingLimit } from '@/core/modules/billing/models'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import { TrashIcon } from '@/ui/primitives/icons'

interface RemoveUsageLimitDialogProps {
  disabled?: boolean
  hideTrigger?: boolean
  onRemoved: () => void
  onOpenChange?: (open: boolean) => void
  open?: boolean
  teamSlug: string
}

export const RemoveUsageLimitDialog = ({
  disabled = false,
  hideTrigger = false,
  onRemoved,
  onOpenChange,
  open,
  teamSlug,
}: RemoveUsageLimitDialogProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalIsOpen

  const setIsOpen = (nextOpen: boolean) => {
    if (!isControlled) setInternalIsOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }

  const limitsQueryKey = trpc.billing.getLimits.queryOptions({
    teamSlug,
  }).queryKey

  const clearLimitMutation = useMutation(
    trpc.billing.clearLimit.mutationOptions({
      onSuccess: () => {
        queryClient.setQueryData<BillingLimit | undefined>(
          limitsQueryKey,
          (limits) => {
            if (!limits) return limits
            return { ...limits, limit_amount_gte: null }
          }
        )
        toast(defaultSuccessToast('Billing limit removed.'))
        onRemoved()
        setIsOpen(false)
        queryClient.invalidateQueries({ queryKey: limitsQueryKey })
      },
      onError: (error) => {
        toast(
          defaultErrorToast(error.message || 'Failed to remove billing limit.')
        )
      },
    })
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="md"
            className="font-sans normal-case"
            disabled={disabled || clearLimitMutation.isPending}
            loading={clearLimitMutation.isPending}
          >
            <TrashIcon className="size-4" />
            Remove
          </Button>
        </DialogTrigger>
      )}
      <DialogContent hideClose className="max-w-[505px] pr-8 sm:max-w-[505px]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <DialogTitle>Remove usage limit?</DialogTitle>
            <DialogDescription className="text-fg-secondary prose-body max-w-[460px]">
              API limits will be removed and usage will become uncapped
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 self-end sm:self-center">
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="font-sans normal-case text-fg-tertiary hover:text-fg"
              disabled={clearLimitMutation.isPending}
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="error"
              size="md"
              className="font-sans normal-case"
              loading={clearLimitMutation.isPending}
              onClick={() =>
                clearLimitMutation.mutate({ teamSlug, type: 'limit' })
              }
            >
              <TrashIcon className="size-4" />
              Remove
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
