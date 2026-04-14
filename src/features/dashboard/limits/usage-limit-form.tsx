'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import type { BillingLimit } from '@/core/modules/billing/models'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  formatCurrencyValue,
  sanitizeCurrencyInput,
} from '@/lib/utils/currency'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { RemoveUsageLimitDialog } from './remove-usage-limit-dialog'
import { SetUsageLimitDialog } from './set-usage-limit-dialog'

interface UsageLimitFormProps {
  className?: string
  originalValue: number | null
  teamSlug: string
}

const saveErrorMessage = 'Failed to save billing limit.'
const saveSuccessMessage = 'Billing limit saved.'
const emptyErrorMessage = 'Enter a billing limit amount.'

const limitValueSchema = z
  .string()
  .trim()
  .min(1, 'Enter a value.')
  .regex(/^\d+$/, 'Enter a whole USD amount.')
  .transform(Number)
  .refine((value) => value >= 1, 'Value must be at least 1.')

export const UsageLimitForm = ({
  className,
  originalValue,
  teamSlug,
}: UsageLimitFormProps) => {
  const [draftValue, setDraftValue] = useState(
    originalValue === null ? '' : formatCurrencyValue(originalValue)
  )
  const [isEditing, setIsEditing] = useState(originalValue === null)
  const [isSetDialogOpen, setIsSetDialogOpen] = useState(false)
  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const limitsQueryKey = trpc.billing.getLimits.queryOptions({
    teamSlug,
  }).queryKey

  useEffect(() => {
    setDraftValue(
      originalValue === null ? '' : formatCurrencyValue(originalValue)
    )
    setIsEditing(originalValue === null)
  }, [originalValue])

  const setLimitMutation = useMutation(
    trpc.billing.setLimit.mutationOptions({
      onSuccess: (_, variables) => {
        queryClient.setQueryData<BillingLimit | undefined>(
          limitsQueryKey,
          (limits) => {
            if (!limits) return limits
            return { ...limits, limit_amount_gte: variables.value }
          }
        )
        toast(defaultSuccessToast(saveSuccessMessage))
        setDraftValue(formatCurrencyValue(variables.value))
        setIsEditing(false)
        setIsSetDialogOpen(false)
        queryClient.invalidateQueries({ queryKey: limitsQueryKey })
      },
      onError: (error) => {
        toast(defaultErrorToast(error.message || saveErrorMessage))
      },
    })
  )

  const parsedValue = limitValueSchema.safeParse(draftValue)
  const nextValue = parsedValue.success ? parsedValue.data : null
  const isMutating = setLimitMutation.isPending
  const canSave =
    parsedValue.success && nextValue !== originalValue && !isMutating
  const shouldShowCancel = originalValue !== null || draftValue.length > 0

  const handleCancel = () => {
    if (originalValue === null) {
      setDraftValue('')
      return
    }

    setDraftValue(formatCurrencyValue(originalValue))
    setIsEditing(false)
  }

  const handleSetConfirm = () => {
    if (!parsedValue.success) {
      toast(
        defaultErrorToast(
          parsedValue.error.issues[0]?.message || emptyErrorMessage
        )
      )
      return
    }

    if (parsedValue.data === originalValue) return
    setLimitMutation.mutate({
      teamSlug,
      type: 'limit',
      value: parsedValue.data,
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!parsedValue.success) {
      toast(
        defaultErrorToast(
          parsedValue.error.issues[0]?.message || emptyErrorMessage
        )
      )
      return
    }

    if (parsedValue.data === originalValue || isMutating) return
    setIsSetDialogOpen(true)
  }

  if (originalValue !== null && !isEditing)
    return (
      <div
        className={cn(
          'flex min-h-[72px] items-center justify-between gap-4 px-4 py-4 md:px-5',
          className
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="prose-value-big text-fg">$</span>
          <Input
            aria-label="limit amount"
            className="prose-value-big text-fg pointer-events-none h-auto border-0 bg-transparent px-0 py-0 font-mono shadow-none"
            readOnly
            tabIndex={-1}
            value={formatCurrencyValue(originalValue)}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RemoveUsageLimitDialog
            disabled={isMutating}
            teamSlug={teamSlug}
            onRemoved={() => {
              setDraftValue('')
              setIsEditing(true)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="md"
            className="font-sans normal-case"
            disabled={isMutating}
            onClick={() => {
              setDraftValue(formatCurrencyValue(originalValue))
              setIsEditing(true)
            }}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
        </div>
      </div>
    )

  return (
    <form
      className={cn(
        'flex min-h-[72px] items-center justify-between gap-4 px-4 py-4 md:px-5',
        className
      )}
      onSubmit={handleSubmit}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="prose-value-big text-fg">$</span>
        <Input
          aria-label="limit amount"
          autoFocus={originalValue !== null}
          className="prose-value-big text-fg h-auto border-0 bg-transparent px-0 py-0 font-mono shadow-none placeholder:text-fg-tertiary hover:bg-transparent focus:bg-transparent focus:[border-bottom:0] focus:outline-none"
          disabled={isMutating}
          inputMode="numeric"
          onChange={(event) =>
            setDraftValue(sanitizeCurrencyInput(event.target.value))
          }
          placeholder="--"
          value={draftValue}
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {shouldShowCancel && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            className="font-sans normal-case text-fg-tertiary hover:text-fg"
            disabled={isMutating}
            onClick={handleCancel}
          >
            Cancel
          </Button>
        )}
        <SetUsageLimitDialog
          confirmDisabled={!parsedValue.success}
          loading={setLimitMutation.isPending}
          onConfirm={handleSetConfirm}
          onOpenChange={setIsSetDialogOpen}
          open={isSetDialogOpen}
          title={`Set $${nextValue === null ? '--' : formatCurrencyValue(nextValue)} usage limit?`}
          triggerDisabled={!canSave}
        />
      </div>
    </form>
  )
}
