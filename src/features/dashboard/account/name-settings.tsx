'use client'

import { updateUserAction } from '@/server/user/user-actions'
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
import { useUser } from '@/lib/hooks/use-user'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { cn } from '@/lib/utils'
import { useToast } from '@/lib/hooks/use-toast'
import { defaultSuccessToast, defaultErrorToast } from '@/lib/hooks/use-toast'

const formSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(32, 'Max 32 characters'),
})

type FormValues = z.infer<typeof formSchema>

interface NameSettingsProps {
  className?: string
}

export function NameSettings({ className }: NameSettingsProps) {
  'use no memo'

  const { user } = useUser()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.user_metadata?.name || '',
    },
    values: {
      name: user?.user_metadata?.name || '',
    },
  })

  const { execute: updateName, isPending } = useAction(updateUserAction, {
    onSuccess: async () => {
      toast(defaultSuccessToast('Name updated.'))
    },
    onError: (error) => {
      toast(
        defaultErrorToast(error.error.serverError || 'Failed to update name.')
      )
    },
  })

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
          className={cn('overflow-hidden rounded-xs border', className)}
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

          <CardFooter className="bg-bg-100 justify-between">
            <p className="text-fg-500 text-sm">Max 32 characters.</p>
            <Button
              loading={isPending}
              disabled={form.watch('name') === user?.user_metadata?.name}
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
