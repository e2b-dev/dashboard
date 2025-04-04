'use client'

import { updateUserAction } from '@/server/user/user-actions'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { Button } from '@/ui/primitives/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/ui/primitives/form'
import { Input } from '@/ui/primitives/input'
import { useUser } from '@/lib/hooks/use-user'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { cn } from '@/lib/utils'
import { useToast } from '@/lib/hooks/use-toast'
import { defaultSuccessToast, defaultErrorToast } from '@/lib/hooks/use-toast'

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

  const { execute: updateEmail, isPending } = useAction(updateUserAction, {
    onSuccess: () => {
      toast(defaultSuccessToast('Check your email for a verification link.'))
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
        /*         if (searchParams.has('new_email')) {
          setUser((state) => ({
            ...state!,
            email: searchParams.get('new_email')!,
          }))
        } */

        toast(
          defaultSuccessToast(decodeURIComponent(searchParams.get('success')!))
        )

        /*         refetchUser() */
      } else {
        toast(defaultErrorToast(decodeURIComponent(searchParams.get('error')!)))
      }
    }
  }, [searchParams])

  if (!user) return null

  return (
    <Card className={cn('overflow-hidden rounded-xs border', className)}>
      <CardHeader>
        <CardTitle>E-Mail</CardTitle>
        <CardDescription>Update your e-mail address.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              updateEmail({ email: values.email })
            )}
            className="flex gap-2"
          >
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
          </form>
        </Form>
      </CardContent>
      <CardFooter className="bg-bg-100 justify-between">
        <p className="text-fg-500 text-sm">Has to be a valid e-mail address.</p>
        <Button
          loading={isPending}
          disabled={form.watch('email') === user?.email}
          type="submit"
        >
          Save
        </Button>
      </CardFooter>
    </Card>
  )
}
