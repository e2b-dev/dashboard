'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { USER_MESSAGES } from '@/configs/user-messages'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/ui/primitives/form'
import { Input } from '@/ui/primitives/input'
import { useDashboard } from '../context'

const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Max 100 characters'),
})

type FormValues = z.infer<typeof formSchema>

interface NameSettingsProps {
  className?: string
}

export function NameSettings({ className }: NameSettingsProps) {
  'use no memo'

  const { user } = useDashboard()
  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || '',
    },
    values: {
      name: user?.name || '',
    },
  })

  const { mutate: updateName, isPending } = useMutation(
    trpc.user.update.mutationOptions({
      onSuccess: (data) => {
        if (data.status === 'ok') {
          queryClient.setQueryData(trpc.user.profile.queryKey(), data.user)
          toast(defaultSuccessToast(USER_MESSAGES.nameUpdated.message))
          return
        }

        toast(defaultErrorToast(USER_MESSAGES.failedUpdateName.message))
      },
      onError: () => {
        toast(defaultErrorToast(USER_MESSAGES.failedUpdateName.message))
      },
    })
  )

  if (!user) return null

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          updateName({ name: values.name })
        )}
        className="w-full"
      >
        <Card
          className={cn('overflow-hidden border-b md:border', className)}
          hideUnderline
        >
          <CardHeader>
            <CardTitle>Name</CardTitle>
            <CardDescription>
              Update your account name, which will be visible to your team
              members.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="max-w-[17rem] flex-1">
                  <FormControl>
                    <Input placeholder="Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="bg-bg-1 justify-between">
            <p className="text-fg-tertiary ">Max 100 characters.</p>
            <Button
              loading={isPending ? 'Saving...' : undefined}
              disabled={form.watch('name') === user?.name}
              type="submit"
              onClick={form.handleSubmit((values) =>
                updateName({ name: values.name })
              )}
            >
              Save
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
