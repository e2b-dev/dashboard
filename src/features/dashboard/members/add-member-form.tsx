'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { addTeamMemberAction } from '@/core/server/actions/team-actions'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'
import { Input } from '@/ui/primitives/input'
import { useDashboard } from '../context'

const addMemberSchema = z.object({
  email: z.email(),
})

type AddMemberFormValues = z.infer<typeof addMemberSchema>

interface AddMemberEmailFormProps {
  className?: string
  /** Called after a successful invite (e.g. close dialog). */
  onSuccess?: () => void
  submitLabel?: string
  showLabel?: boolean
}

export const AddMemberEmailForm = ({
  className,
  onSuccess,
  submitLabel = 'Add member',
  showLabel = true,
}: AddMemberEmailFormProps) => {
  'use no memo'

  const { team } = useDashboard()
  const { toast } = useToast()

  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      email: '',
    },
  })

  const { execute, isExecuting } = useAction(addTeamMemberAction, {
    onSuccess: () => {
      toast(defaultSuccessToast('The member has been added to the team.'))
      form.reset()
      onSuccess?.()
    },
    onError: ({ error }) => {
      toast(defaultErrorToast(error.serverError || 'An error occurred.'))
    },
  })

  const onSubmit = (data: AddMemberFormValues) => {
    if (!team) return

    execute({
      teamSlug: team.slug,
      email: data.email,
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('flex flex-col gap-4', className)}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              {showLabel ? <FormLabel>E-mail</FormLabel> : null}
              <FormControl>
                <Input placeholder="member@acme.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button
            loading={isExecuting}
            type="submit"
            disabled={!form.formState.isValid}
            variant="default"
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
