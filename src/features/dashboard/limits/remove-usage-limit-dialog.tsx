import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
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

interface RemoveUsageLimitDialogProps {
  disabled?: boolean
  onRemoved: () => void
  teamSlug: string
}

export const RemoveUsageLimitDialog = ({
  disabled = false,
  onRemoved,
  teamSlug,
}: RemoveUsageLimitDialogProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

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
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="md"
          className="font-sans normal-case"
          disabled={disabled || clearLimitMutation.isPending}
          loading={clearLimitMutation.isPending}
        >
          <Trash2 className="size-4" />
          Remove
        </Button>
      </DialogTrigger>
      <DialogContent
        hideClose
        className="max-w-[505px] pr-8 sm:max-w-[505px]"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <DialogTitle>Remove usage limit?</DialogTitle>
            <DialogDescription className="text-fg-secondary prose-body max-w-[460px]">
              API limits will be removed and usage will become uncapped
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-5 self-end sm:self-center">
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
              <Trash2 className="size-4" />
              Remove
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
