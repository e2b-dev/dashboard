'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import type { BillingLimit } from '@/core/modules/billing/models'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  CurrencyInputSchema,
  formatCurrencyValue,
  sanitizeCurrencyInput,
} from '@/lib/utils/currency'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import { EditIcon, TrashIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'

const AlertFormSchema = z.object({
  amount: CurrencyInputSchema,
})

type AlertFormValues = z.infer<typeof AlertFormSchema>

interface UsageAlertFormProps {
  className?: string
  originalValue: number | null
  teamSlug: string
}

export const UsageAlertForm = ({
  className,
  originalValue,
  teamSlug,
}: UsageAlertFormProps) => {
  const hasMountedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(originalValue === null)
  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const limitsQueryKey = trpc.billing.getLimits.queryOptions({
    teamSlug,
  }).queryKey

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(AlertFormSchema),
    mode: 'onChange',
    defaultValues: {
      amount: originalValue === null ? '' : formatCurrencyValue(originalValue),
    },
  })

  const draftValue = form.watch('amount')

  useEffect(() => {
    form.reset({
      amount: originalValue === null ? '' : formatCurrencyValue(originalValue),
    })
    setIsEditing(originalValue === null)
  }, [originalValue, form.reset])

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

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
        form.reset({ amount: formatCurrencyValue(variables.value) })
        setIsEditing(false)
        queryClient.invalidateQueries({ queryKey: limitsQueryKey })
      },
      onError: (error) => {
        toast(
          defaultErrorToast(error.message || 'Failed to save billing alert.')
        )
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
        form.reset({ amount: '' })
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

  const isMutating = setAlertMutation.isPending || clearAlertMutation.isPending
  const isClearIntent =
    isEditing && originalValue !== null && draftValue.length === 0
  const canSave =
    isEditing &&
    (isClearIntent ||
      (form.formState.isValid && Number(draftValue) !== originalValue)) &&
    !isMutating
  const shouldShowCancel =
    isEditing && (originalValue !== null || draftValue.length > 0)

  const handleCancel = () => {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement) activeElement.blur()
    inputRef.current?.blur()

    if (originalValue === null) {
      form.reset({ amount: '' })
      return
    }

    form.reset({ amount: formatCurrencyValue(originalValue) })
    setIsEditing(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isEditing) return

    if (isClearIntent) {
      clearAlertMutation.mutate({ teamSlug, type: 'alert' })
      return
    }

    const isValid = await form.trigger()
    if (!isValid) {
      toast(
        defaultErrorToast(
          form.formState.errors.amount?.message ||
            'Enter a billing alert amount.'
        )
      )
      return
    }

    const value = Number(form.getValues('amount'))
    if (value === originalValue) return
    setAlertMutation.mutate({ teamSlug, type: 'alert', value })
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
        <Controller
          control={form.control}
          name="amount"
          render={({ field }) => (
            <Input
              aria-label="alert amount"
              ref={(el) => {
                field.ref(el)
                inputRef.current = el
              }}
              className="prose-value-big text-fg h-auto border-0 bg-transparent px-0 py-0 font-mono shadow-none placeholder:text-fg-tertiary hover:bg-transparent focus:bg-transparent focus:[border-bottom:0] focus:outline-none"
              disabled={isMutating}
              inputMode="numeric"
              onChange={(event) => {
                if (!isEditing) return
                field.onChange(sanitizeCurrencyInput(event.target.value))
              }}
              onBlur={field.onBlur}
              onFocus={() => {
                if (originalValue === null || isEditing) return
                setIsEditing(true)
              }}
              placeholder="--"
              readOnly={!isEditing && originalValue !== null}
              value={field.value}
            />
          )}
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
                form.reset({ amount: formatCurrencyValue(originalValue) })
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
