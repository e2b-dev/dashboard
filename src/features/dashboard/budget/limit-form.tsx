'use client'

import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  clearLimitAction,
  setLimitAction,
} from '@/server/billing/billing-actions'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { useTransition } from 'react'
import { useState } from 'react'
import { Label } from '@/ui/primitives/label'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
} from '@/ui/primitives/form'
import { NumberInput } from '@/ui/number-input'

interface LimitFormProps {
  teamId: string
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
  teamId,
  className,
  originalValue,
  type,
}: LimitFormProps) {
  'use no memo'

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, startSaveTransition] = useTransition()
  const [isClearing, startClearTransition] = useTransition()
  const { toast } = useToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: originalValue,
    },
  })

  const handleSave = async (data: FormData) => {
    if (!data.value) {
      toast({
        title: 'Error',
        description: 'Input cannot be empty',
        variant: 'error',
      })
      return
    }

    startSaveTransition(async () => {
      try {
        const res = await setLimitAction({
          type,
          value: data.value!,
          teamId,
        })

        if (res.type === 'error') {
          toast({
            title: 'Error',
            description: res.message,
            variant: 'error',
          })
          return
        }

        toast({
          title: type === 'limit' ? 'Limit saved' : 'Alert saved',
          variant: 'default',
        })
        setIsEditing(false)
      } catch (error) {
        toast({
          title: type === 'limit' ? 'Error saving limit' : 'Error saving alert',
          description:
            error instanceof Error
              ? error.message
              : 'An unknown error occurred',
          variant: 'error',
        })
      }
    })
  }

  const handleClear = async () => {
    startClearTransition(async () => {
      try {
        const res = await clearLimitAction({
          type,
          teamId,
        })

        if (res.type === 'error') {
          toast({
            title: 'Error',
            description: res.message,
            variant: 'error',
          })
          return
        }

        toast({
          title: type === 'limit' ? 'Limit cleared' : 'Alert cleared',
          variant: 'default',
        })
        setIsEditing(false)
        form.reset({ value: null })
      } catch (error) {
        toast({
          title:
            type === 'limit' ? 'Error clearing limit' : 'Error clearing alert',
          description:
            error instanceof Error
              ? error.message
              : 'An unknown error occurred',
          variant: 'error',
        })
      }
    })
  }

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
                  <FormLabel className="text-accent text-xs">
                    $ <span className="text-fg-500">[USD]</span>
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
      <div className="text-accent mx-2 font-mono text-xs">
        {'$ '}
        <span className="text-fg text-lg font-semibold">
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
