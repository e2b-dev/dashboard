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
import { focusBlockInputOnMouseDown } from './focus-block-input'
import { RemoveUsageLimitDialog } from './remove-usage-limit-dialog'
import { SetUsageLimitDialog } from './set-usage-limit-dialog'

const limitFormSchema = z.object({
  amount: CurrencyInputSchema,
})

type LimitFormValues = z.infer<typeof limitFormSchema>

interface UsageLimitFormProps {
  className?: string
  originalValue: number | null
  teamSlug: string
}

export const UsageLimitForm = ({
  className,
  originalValue,
  teamSlug,
}: UsageLimitFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(originalValue === null)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [isSetDialogOpen, setIsSetDialogOpen] = useState(false)
  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const formattedOriginalValue =
    originalValue === null ? '' : formatCurrencyValue(originalValue)

  const limitsQueryKey = trpc.billing.getLimits.queryOptions({
    teamSlug,
  }).queryKey

  const form = useForm<LimitFormValues>({
    resolver: zodResolver(limitFormSchema),
    mode: 'onChange',
    defaultValues: {
      amount: formattedOriginalValue,
    },
  })

  const draftValue = form.watch('amount')

  useEffect(() => {
    form.reset({
      amount: formattedOriginalValue,
    })
    setIsEditing(originalValue === null)
  }, [formattedOriginalValue, originalValue, form.reset])

  useEffect(() => {
    if (!isEditing) return
    inputRef.current?.focus()
    const inputLength = inputRef.current?.value.length ?? 0
    inputRef.current?.setSelectionRange(inputLength, inputLength)
  }, [isEditing])

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
        toast(defaultSuccessToast('Billing limit saved.'))
        form.reset({ amount: formatCurrencyValue(variables.value) })
        setIsEditing(false)
        setIsSetDialogOpen(false)
        queryClient.invalidateQueries({ queryKey: limitsQueryKey })
      },
      onError: (error) => {
        toast(
          defaultErrorToast(error.message || 'Failed to save billing limit.')
        )
      },
    })
  )

  const nextValue = form.formState.isValid ? Number(draftValue) : null
  const isMutating = setLimitMutation.isPending
  const isRemoveIntent =
    isEditing && originalValue !== null && draftValue.length === 0
  const canSave =
    isEditing &&
    form.formState.isValid &&
    nextValue !== originalValue &&
    !isMutating
  const isInputEditable = isEditing || originalValue === null
  const shouldShowCancel =
    isEditing && (originalValue !== null || draftValue.length > 0)
  const setLimitTitle = `Set $${nextValue === null ? '--' : formatCurrencyValue(nextValue)} usage limit?`

  const startEditing = (): void => {
    if (originalValue === null) return
    form.reset({ amount: formattedOriginalValue })
    setIsEditing(true)
  }

  const openRemoveDialog = (): void => setIsRemoveDialogOpen(true)

  const handleCancel = (): void => {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement) activeElement.blur()
    inputRef.current?.blur()

    if (originalValue === null) {
      form.reset({ amount: '' })
      return
    }

    form.reset({ amount: formattedOriginalValue })
    setIsEditing(false)
  }

  const handleSetConfirm = (): void => {
    if (!form.formState.isValid) return
    const value = Number(form.getValues('amount'))
    if (value === originalValue) return
    setLimitMutation.mutate({ teamSlug, type: 'limit', value })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isEditing) return

    if (isRemoveIntent) {
      setIsRemoveDialogOpen(true)
      return
    }

    const isValid = await form.trigger()
    if (!isValid) {
      toast(
        defaultErrorToast(
          form.formState.errors.amount?.message ||
            'Enter a billing limit amount.'
        )
      )
      return
    }

    const value = Number(form.getValues('amount'))
    if (value === originalValue || isMutating) return
    setIsSetDialogOpen(true)
  }

  return (
    <form
      className={cn(
        'flex min-h-[72px] items-center justify-between gap-4 px-4 py-4 md:px-5',
        className
      )}
      onMouseDown={focusBlockInputOnMouseDown}
      onSubmit={handleSubmit}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="prose-value-big text-fg">$</span>
        <Controller
          control={form.control}
          name="amount"
          render={({ field }) => (
            <Input
              aria-label="limit amount"
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
              onMouseDown={(event) => {
                if (isInputEditable) return
                event.preventDefault()
              }}
              placeholder="--"
              readOnly={!isEditing && originalValue !== null}
              tabIndex={isInputEditable ? undefined : -1}
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
              disabled={isMutating}
              onClick={openRemoveDialog}
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
              onClick={startEditing}
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
            {isRemoveIntent ? (
              <Button
                type="button"
                variant="default"
                size="md"
                className="font-sans normal-case"
                disabled={isMutating}
                onClick={openRemoveDialog}
              >
                Set
              </Button>
            ) : (
              <SetUsageLimitDialog
                confirmDisabled={!form.formState.isValid}
                loading={setLimitMutation.isPending}
                onConfirm={handleSetConfirm}
                onOpenChange={setIsSetDialogOpen}
                open={isSetDialogOpen}
                title={setLimitTitle}
                triggerDisabled={!canSave}
              />
            )}
          </>
        )}
      </div>
      <RemoveUsageLimitDialog
        hideTrigger
        onOpenChange={setIsRemoveDialogOpen}
        open={isRemoveDialogOpen}
        teamSlug={teamSlug}
        onRemoved={() => {
          form.reset({ amount: '' })
          setIsEditing(true)
        }}
      />
    </form>
  )
}
