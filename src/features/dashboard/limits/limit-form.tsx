'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
import { NumberInput } from '@/ui/number-input'
import { Button } from '@/ui/primitives/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'

interface LimitFormProps {
  teamIdOrSlug: string
  className?: string
  originalValue: number | null
  type: 'limit' | 'alert'
}

const formSchema = z.object({
  value: z
    .number()
    .min(0, 'Value must be greater than or equal to 0')
    .nullable(),
})

type FormData = z.infer<typeof formSchema>

export default function LimitForm({
  teamIdOrSlug,
  className,
  originalValue,
  type,
}: LimitFormProps) {
  'use no memo'

  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: originalValue,
    },
  })

  const limitsQueryKey = trpc.billing.getLimits.queryOptions({
    teamIdOrSlug,
  }).queryKey

  const setLimitMutation = useMutation(
    trpc.billing.setLimit.mutationOptions({
      onSuccess: () => {
        toast(
          defaultSuccessToast(
            `Billing ${type === 'limit' ? 'limit' : 'alert'} saved.`
          )
        )
        setIsEditing(false)
        queryClient.invalidateQueries({ queryKey: limitsQueryKey })
      },
      onError: (error) => {
        toast(
          defaultErrorToast(
            error.message ||
              `Failed to save billing ${type === 'limit' ? 'limit' : 'alert'}.`
          )
        )
      },
    })
  )

  const clearLimitMutation = useMutation(
    trpc.billing.clearLimit.mutationOptions({
      onSuccess: () => {
        toast(
          defaultSuccessToast(
            `Billing ${type === 'limit' ? 'limit' : 'alert'} cleared.`
          )
        )
        setIsEditing(false)
        form.reset({ value: null })
        queryClient.invalidateQueries({ queryKey: limitsQueryKey })
      },
      onError: () => {
        toast(
          defaultErrorToast(
            `Failed to clear billing ${type === 'limit' ? 'limit' : 'alert'}.`
          )
        )
      },
    })
  )

  const handleSave = (data: FormData) => {
    if (!data.value) {
      toast(defaultErrorToast('Input cannot be empty.'))
      return
    }

    setLimitMutation.mutate({
      teamIdOrSlug,
      type,
      value: data.value,
    })
  }

  const handleClear = () => {
    clearLimitMutation.mutate({
      teamIdOrSlug,
      type,
    })
  }

  const isSaving = setLimitMutation.isPending
  const isClearing = clearLimitMutation.isPending

  if (originalValue === null || isEditing) {
    return (
      <Form {...form}>
        <form
          className={cn('space-y-3', className)}
          onSubmit={form.handleSubmit(handleSave)}
        >
          <div className="flex w-min items-end gap-2">
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-accent-main-highlight text-xs">
                    $ <span className="text-fg-tertiary">[USD]</span>
                  </FormLabel>
                  <FormControl>
                    <NumberInput
                      min={0}
                      step={10}
                      value={field.value || 0}
                      onChange={(value) => {
                        field.onChange(value)
                      }}
                      placeholder={'$'}
                    />
                    {/*                     <Input
                      type="number"
                      min={0}
                      step={10}
                      placeholder="$"
                      {...field}
                      onChange={(e) => {
                        const value =
                          e.target.value === '' ? null : Number(e.target.value)
                        field.onChange(value)
                      }}
                      value={field.value ?? ''}
                    /> */}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              variant="outline"
              className="h-9 px-4"
              disabled={
                form.getValues('value') === originalValue ||
                isSaving ||
                isClearing
              }
              loading={isSaving}
            >
              Set
            </Button>
            {originalValue !== null && (
              <Button
                type="button"
                variant="error"
                size="sm"
                className="h-9 px-4"
                disabled={isSaving || isClearing}
                loading={isClearing}
                onClick={handleClear}
              >
                Clear
              </Button>
            )}
          </div>
        </form>
      </Form>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="text-accent-main-highlight mx-2 prose-value-small">
        {'$ '}
        <span className="text-fg prose-value-big">
          {originalValue?.toLocaleString()}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsEditing(true)}
      >
        Edit
      </Button>
      <Button
        type="button"
        variant="error"
        size="sm"
        onClick={handleClear}
        disabled={isSaving || isClearing}
        loading={isClearing}
      >
        Clear
      </Button>
    </div>
  )
}
