'use client'

import { USER_MESSAGES } from '@/configs/user-messages'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { useUser } from '@/lib/hooks/use-user'
import { cn } from '@/lib/utils'
import { getUserProviders } from '@/lib/utils/auth'
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
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const formSchema = z.object({
  email: z.string().email('Invalid e-mail address'),
})

type FormValues = z.infer<typeof formSchema>

interface EmailSettingsProps {
  className?: string
}

export function EmailSettings({ className }: EmailSettingsProps) {
  'use no memo'

  const { user } = useUser()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: searchParams.get('new_email') || user?.email || '',
    },
    values: {
      email: searchParams.get('new_email') || user?.email || '',
    },
  })

  const hasEmailProvider = useMemo(
    () => getUserProviders(user)?.includes('email'),
    [user]
  )

  const { execute: updateEmail, isPending } = useAction(updateUserAction, {
    onSuccess: () => {
      toast(
        defaultSuccessToast(USER_MESSAGES.emailUpdateVerification.message, {
          duration: USER_MESSAGES.emailUpdateVerification.timeoutMs,
        })
      )
    },
    onError: ({ error }) => {
      if (error.validationErrors?.fieldErrors?.email?.[0]) {
        form.setError('email', {
          message: error.validationErrors.fieldErrors.email?.[0],
        })
        return
      }

      toast(defaultErrorToast(error.serverError || 'Failed to update e-mail.'))
    },
  })

  useEffect(() => {
    if (
      !searchParams.has('success') &&
      !searchParams.has('error') &&
      !searchParams.has('type')
    )
      return

    if (searchParams.get('type') === 'update_email') {
      if (searchParams.has('success')) {
        toast(
          defaultSuccessToast(decodeURIComponent(searchParams.get('success')!))
        )
        return
      }

      if (searchParams.has('message')) {
        toast(
          defaultSuccessToast(decodeURIComponent(searchParams.get('message')!))
        )
        return
      }

      toast(
        defaultErrorToast(
          decodeURIComponent(
            searchParams.get('error') ?? 'Failed to update e-mail.'
          )
        )
      )
    }
  }, [searchParams])

  if (!user || !hasEmailProvider) return null

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          updateEmail({ email: values.email })
        )}
        className="w-full"
      >
        <Card className={cn('overflow-hidden rounded-xs border', className)}>
          <CardHeader>
            <CardTitle>E-Mail</CardTitle>
            <CardDescription>Update your e-mail address.</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="max-w-[17rem] flex-1">
                  <FormControl>
                    <Input
                      placeholder="E-Mail"
                      className="md:max-w-[17rem]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="bg-bg-100 justify-between">
            <p className="text-fg-500 text-sm">
              Has to be a valid e-mail address.
            </p>
            <Button
              loading={isPending}
              disabled={form.watch('email') === user?.email}
              type="submit"
              onClick={form.handleSubmit((values) =>
                updateEmail({ email: values.email })
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
