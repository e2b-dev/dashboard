'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/primitives/form'
import { AddIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { useDashboard } from '../context'

const addMemberSchema = z.object({
  email: z.email(),
})

type AddMemberForm = z.infer<typeof addMemberSchema>

interface AddMemberFormProps {
  className?: string
  onSuccess?: () => void
}

export const AddMemberForm = ({ className, onSuccess }: AddMemberFormProps) => {
  'use no memo'

  const { team } = useDashboard()
  const router = useRouter()
  const trpc = useTRPC()
  const { toast } = useToast()

  const form = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
    },
  })

  const addMemberMutation = useMutation(
    trpc.teams.addMember.mutationOptions({
      onSuccess: () => {
        toast(defaultSuccessToast('The member has been added to the team.'))
        form.reset()
        router.refresh()
        onSuccess?.()
      },
      onError: (error) => {
        toast(defaultErrorToast(error.message || 'An error occurred.'))
      },
    })
  )

  const onSubmit = (data: AddMemberForm) => {
    if (!team) return

    addMemberMutation.mutate({
      teamSlug: team.slug,
      email: data.email,
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('flex items-start gap-1 py-1', className)}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel className="sr-only">Email</FormLabel>
              <FormControl>
                <Input
                  className="h-9 font-sans"
                  aria-label="Email"
                  placeholder="Enter email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          className="normal-case font-sans"
          loading={addMemberMutation.isPending}
          type="submit"
          disabled={!form.formState.isValid}
          size="md"
          variant="default"
        >
          <AddIcon aria-hidden className="size-4 shrink-0" />
          Add
        </Button>
      </form>
    </Form>
  )
}
