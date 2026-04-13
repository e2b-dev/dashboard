'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, TriangleAlert } from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { z } from 'zod'
import type { BillingLimit } from '@/core/modules/billing/models'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { Input } from '@/ui/primitives/input'

interface LimitFormProps {
  className?: string
  originalValue: number | null
  teamSlug: string
  type: 'limit' | 'alert'
}

interface LimitConfirmationDialogProps {
  actions: ReactNode
  children: ReactNode
  icon: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
}

const limitCopy = {
  alert: {
    clearError: 'Failed to remove billing alert.',
    clearSuccess: 'Billing alert removed.',
    emptyError: 'Enter a billing alert amount.',
    saveError: 'Failed to save billing alert.',
    saveSuccess: 'Billing alert saved.',
  },
  limit: {
    clearError: 'Failed to remove billing limit.',
    clearSuccess: 'Billing limit removed.',
    emptyError: 'Enter a billing limit amount.',
    saveError: 'Failed to save billing limit.',
    saveSuccess: 'Billing limit saved.',
  },
} satisfies Record<
  LimitFormProps['type'],
  {
    clearError: string
    clearSuccess: string
    emptyError: string
    saveError: string
    saveSuccess: string
  }
>

const currencyFormatter = new Intl.NumberFormat('en-US')

const limitValueSchema = z
  .string()
  .trim()
  .min(1, 'Enter a value.')
  .regex(/^\d+$/, 'Enter a whole USD amount.')
  .transform(Number)
  .refine((value) => value >= 1, 'Value must be at least 1.')

// Removes non-digits from a currency draft. Example: "$1,250" -> "1250".
const sanitizeCurrencyInput = (value: string) => value.replace(/\D+/g, '')

// Formats a numeric billing limit for display. Example: 1250 -> "1,250".
const formatCurrencyValue = (value: number) => currencyFormatter.format(value)

// Updates the matching limit field in cached billing data. Example: ("alert", 50) -> { alert_amount_gte: 50 }.
const updateLimitValue = (
  limits: BillingLimit | undefined,
  type: LimitFormProps['type'],
  nextValue: number | null
) => {
  if (!limits) return limits
  if (type === 'limit') return { ...limits, limit_amount_gte: nextValue }
  return { ...limits, alert_amount_gte: nextValue }
}

const LimitConfirmationDialog = ({
  actions,
  children,
  icon,
  open,
  onOpenChange,
  title,
}: LimitConfirmationDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      hideClose
      className="w-full max-w-[505px] gap-6 p-5 sm:max-w-[505px]"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 shrink-0">{icon}</div>
            <DialogTitle className="prose-body-highlight text-fg normal-case">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-fg-secondary prose-body max-w-[320px]">
            {children}
          </DialogDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
          {actions}
        </div>
      </div>
    </DialogContent>
  </Dialog>
)

export default function LimitForm({
  className,
  originalValue,
  teamSlug,
  type,
}: LimitFormProps) {
  const [draftValue, setDraftValue] = useState(
    originalValue === null ? '' : formatCurrencyValue(originalValue)
  )
  const [isEditing, setIsEditing] = useState(originalValue === null)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const copy = limitCopy[type]

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
          (limits) => updateLimitValue(limits, type, variables.value)
        )
        toast(defaultSuccessToast(copy.saveSuccess))
        setDraftValue(formatCurrencyValue(variables.value))
        setIsEditing(false)
        setIsSaveDialogOpen(false)
        queryClient.invalidateQueries({ queryKey: limitsQueryKey })
      },
      onError: (error) => {
        toast(defaultErrorToast(error.message || copy.saveError))
      },
    })
  )

  const clearLimitMutation = useMutation(
    trpc.billing.clearLimit.mutationOptions({
      onSuccess: () => {
        queryClient.setQueryData<BillingLimit | undefined>(
          limitsQueryKey,
          (limits) => updateLimitValue(limits, type, null)
        )
        toast(defaultSuccessToast(copy.clearSuccess))
        setDraftValue('')
        setIsEditing(true)
        setIsRemoveDialogOpen(false)
        queryClient.invalidateQueries({ queryKey: limitsQueryKey })
      },
      onError: (error) => {
        toast(defaultErrorToast(error.message || copy.clearError))
      },
    })
  )

  const parsedValue = limitValueSchema.safeParse(draftValue)
  const nextValue = parsedValue.success ? parsedValue.data : null
  const isMutating = setLimitMutation.isPending || clearLimitMutation.isPending
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
          parsedValue.error.issues[0]?.message || copy.emptyError
        )
      )
      return
    }

    if (parsedValue.data === originalValue) return
    if (type === 'limit') return setIsSaveDialogOpen(true)

    setLimitMutation.mutate({ teamSlug, type, value: parsedValue.data })
  }

  const handleRemove = () => {
    if (type === 'limit') return setIsRemoveDialogOpen(true)

    clearLimitMutation.mutate({ teamSlug, type })
  }

  if (originalValue !== null && !isEditing)
    return (
      <>
        <div
          className={cn(
            'flex min-h-[72px] items-center justify-between gap-4 px-4 py-4 md:px-5',
            className
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-fg prose-value-big">$</span>
            <span className="text-fg prose-value-big">
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
              loading={clearLimitMutation.isPending}
              onClick={handleRemove}
            >
              <Trash2 className="size-4" />
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
        {type === 'limit' && (
          <LimitConfirmationDialog
            actions={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  className="font-sans normal-case"
                  disabled={isMutating}
                  onClick={() => setIsRemoveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="md"
                  className="font-sans normal-case"
                  loading={clearLimitMutation.isPending}
                  onClick={() => clearLimitMutation.mutate({ teamSlug, type })}
                >
                  Remove
                </Button>
              </>
            }
            icon={<Trash2 className="text-fg-secondary size-4" />}
            open={isRemoveDialogOpen}
            onOpenChange={setIsRemoveDialogOpen}
            title="Remove usage limit?"
          >
            API limits will be removed and usage will become uncapped.
          </LimitConfirmationDialog>
        )}
      </>
    )

  return (
    <>
      <form
        className={cn(
          'flex min-h-[72px] items-center justify-between gap-4 px-4 py-4 md:px-5',
          className
        )}
        onSubmit={handleSubmit}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-fg prose-value-big">$</span>
          <Input
            aria-label={`${type} amount`}
            autoFocus={originalValue !== null}
            className="text-fg prose-value-big h-auto border-0 bg-transparent px-0 py-0 font-mono shadow-none placeholder:text-fg-secondary hover:bg-transparent focus:bg-transparent focus:[border-bottom:0] focus:outline-none"
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
            loading={setLimitMutation.isPending}
          >
            Set
          </Button>
        </div>
      </form>
      {type === 'limit' && (
        <LimitConfirmationDialog
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                size="md"
                className="font-sans normal-case"
                disabled={isMutating}
                onClick={() => setIsSaveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="md"
                className="font-sans normal-case"
                disabled={!parsedValue.success}
                loading={setLimitMutation.isPending}
                onClick={() => {
                  if (!parsedValue.success) return
                  setLimitMutation.mutate({
                    teamSlug,
                    type,
                    value: parsedValue.data,
                  })
                }}
              >
                Set
              </Button>
            </>
          }
          icon={
            <TriangleAlert className="text-accent-warning-highlight size-4" />
          }
          open={isSaveDialogOpen}
          onOpenChange={setIsSaveDialogOpen}
          title={`Set $${nextValue === null ? '--' : formatCurrencyValue(nextValue)} usage limit?`}
        >
          If your API usage hits this limit, all requests including sandbox
          creation will be blocked. This may interrupt your services until you
          raise or remove the limit.
        </LimitConfirmationDialog>
      )}
    </>
  )
}
