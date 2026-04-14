'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
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

interface UsageAlertFormProps {
  className?: string
  originalValue: number | null
  teamSlug: string
}

const alertValueSchema = z
  .string()
  .trim()
  .min(1, 'Enter a value.')
  .regex(/^\d+$/, 'Enter a whole USD amount.')
  .transform(Number)
  .refine((value) => value >= 1, 'Value must be at least 1.')

export const UsageAlertForm = ({
  className,
  originalValue,
  teamSlug,
}: UsageAlertFormProps) => {
  const [draftValue, setDraftValue] = useState(
    originalValue === null ? '' : formatCurrencyValue(originalValue)
  )
  const [isEditing, setIsEditing] = useState(originalValue === null)
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

  const setAlertMutation = useMutation(
    trpc.billing.setLimit.mutationOptions({
      onSuccess: (_, variables) => {
        queryClient.setQueryData<BillingLimit | undefined>(
          limitsQueryKey,
          (limits) => {
            if (!limits) return limits
            return { ...limits, alert_amount_gte: variables.value }
          }
        )
        toast(defaultSuccessToast('Billing alert saved.'))
        setDraftValue(formatCurrencyValue(variables.value))
        setIsEditing(false)
        queryClient.invalidateQueries({ queryKey: limitsQueryKey })
      },
      onError: (error) => {
        toast(defaultErrorToast(error.message || 'Failed to save billing alert.'))
      },
    })
  )

  const clearAlertMutation = useMutation(
    trpc.billing.clearLimit.mutationOptions({
      onSuccess: () => {
        queryClient.setQueryData<BillingLimit | undefined>(
          limitsQueryKey,
          (limits) => {
            if (!limits) return limits
            return { ...limits, alert_amount_gte: null }
          }
        )
        toast(defaultSuccessToast('Billing alert removed.'))
        setDraftValue('')
        setIsEditing(true)
        queryClient.invalidateQueries({ queryKey: limitsQueryKey })
      },
      onError: (error) => {
        toast(
          defaultErrorToast(error.message || 'Failed to remove billing alert.')
        )
      },
    })
  )

  const parsedValue = alertValueSchema.safeParse(draftValue)
  const nextValue = parsedValue.success ? parsedValue.data : null
  const isMutating = setAlertMutation.isPending || clearAlertMutation.isPending
  const canSave =
    parsedValue.success && nextValue !== originalValue && !isMutating

  const handleCancel = () => {
    if (originalValue === null) return
    setDraftValue(formatCurrencyValue(originalValue))
    setIsEditing(false)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!parsedValue.success) {
      toast(
        defaultErrorToast(
          parsedValue.error.issues[0]?.message ||
            'Enter a billing alert amount.'
        )
      )
      return
    }

    if (parsedValue.data === originalValue) return
    setAlertMutation.mutate({ teamSlug, type: 'alert', value: parsedValue.data })
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
          <span className="prose-value-big text-fg">
            {formatCurrencyValue(originalValue)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="font-sans normal-case"
            disabled={isMutating}
            loading={clearAlertMutation.isPending}
            onClick={() => clearAlertMutation.mutate({ teamSlug, type: 'alert' })}
          >
            Remove
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            className="font-sans normal-case"
            disabled={isMutating}
            onClick={() => {
              setDraftValue(originalValue.toString())
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
          aria-label="alert amount"
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
        {originalValue !== null && (
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
        <Button
          type="submit"
          variant="default"
          size="md"
          className="font-sans normal-case"
          disabled={!canSave}
          loading={setAlertMutation.isPending}
        >
          Set
        </Button>
      </div>
    </form>
  )
}
