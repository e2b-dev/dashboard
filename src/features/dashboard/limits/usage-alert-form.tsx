'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useRef, useState } from 'react'
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
import { EditIcon, TrashIcon } from '@/ui/primitives/icons'
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
  const inputRef = useRef<HTMLInputElement>(null)
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

  useEffect(() => {
    if (!isEditing) return
    inputRef.current?.focus()
    const inputLength = inputRef.current?.value.length ?? 0
    inputRef.current?.setSelectionRange(inputLength, inputLength)
  }, [isEditing])

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
  const isClearIntent =
    isEditing && originalValue !== null && draftValue.length === 0
  const canSave =
    isEditing &&
    (isClearIntent || (parsedValue.success && nextValue !== originalValue)) &&
    !isMutating
  const shouldShowCancel =
    isEditing && (originalValue !== null || draftValue.length > 0)

  const handleCancel = () => {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement) activeElement.blur()
    inputRef.current?.blur()

    if (originalValue === null) {
      setDraftValue('')
      return
    }

    setDraftValue(formatCurrencyValue(originalValue))
    setIsEditing(false)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isEditing) return

    if (isClearIntent) {
      clearAlertMutation.mutate({ teamSlug, type: 'alert' })
      return
    }

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
          ref={inputRef}
          className="prose-value-big text-fg h-auto border-0 bg-transparent px-0 py-0 font-mono shadow-none placeholder:text-fg-tertiary hover:bg-transparent focus:bg-transparent focus:[border-bottom:0] focus:outline-none"
          disabled={isMutating}
          inputMode="numeric"
          onChange={(event) => {
            if (!isEditing) return
            setDraftValue(sanitizeCurrencyInput(event.target.value))
          }}
          onFocus={() => {
            if (originalValue === null || isEditing) return
            setIsEditing(true)
          }}
          placeholder="--"
          readOnly={!isEditing && originalValue !== null}
          value={draftValue}
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {originalValue !== null && !isEditing ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="md"
              className="font-sans normal-case"
              disabled={isMutating}
              loading={clearAlertMutation.isPending}
              onClick={() =>
                clearAlertMutation.mutate({ teamSlug, type: 'alert' })
              }
            >
              <TrashIcon className="size-4" />
              Remove
            </Button>
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
              <EditIcon className="size-4" />
              Edit
            </Button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </form>
  )
}
