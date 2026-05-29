'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
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
import { ReauthDialog } from './reauth-dialog'

const formSchema = z.object({
  email: z.email('Invalid e-mail address'),
})

type FormValues = z.infer<typeof formSchema>

interface EmailSettingsProps {
  className?: string
}

export function EmailSettings({ className }: EmailSettingsProps) {
  'use no memo'

  const { user } = useDashboard()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [reauthDialogOpen, setReauthDialogOpen] = useState(false)
  const showEmailSettings =
    Boolean(user?.canChangeEmail) || Boolean(user?.providers.includes('email'))
  const canChangeEmail = Boolean(user?.canChangeEmail)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: searchParams.get('new_email') || user?.email || '',
    },
    values: {
      email: searchParams.get('new_email') || user?.email || '',
    },
  })

  const { mutate: updateEmail, isPending } = useMutation(
    trpc.user.update.mutationOptions({
      onSuccess: (data) => {
        if (data.status === 'reauth') {
          setReauthDialogOpen(true)
          return
        }

        if (data.status === 'ok') {
          queryClient.setQueryData(trpc.user.profile.queryKey(), data.user)
          toast(
            defaultSuccessToast(USER_MESSAGES.emailUpdateVerification.message, {
              duration: USER_MESSAGES.emailUpdateVerification.timeoutMs,
            })
          )
          return
        }

        if (data.status === 'error' && data.code === 'email_exists') {
          form.setError('email', { message: 'E-mail already in use.' })
          return
        }

        if (data.status === 'error' && data.code === 'email_invalid') {
          form.setError('email', { message: 'Invalid e-mail address.' })
          return
        }

        if (
          data.status === 'error' &&
          data.code === 'account_credentials_not_changeable'
        ) {
          toast(defaultErrorToast('E-mail changes are currently unavailable.'))
          return
        }

        toast(defaultErrorToast('Failed to update e-mail.'))
      },
      onError: () => {
        toast(defaultErrorToast('Failed to update e-mail.'))
      },
    })
  )

  useEffect(() => {
    if (
      !searchParams.has('success') &&
      !searchParams.has('error') &&
      !searchParams.has('type')
    )
      return

    if (searchParams.get('type') === 'update_email') {
      const success = searchParams.get('success')
      if (success !== null) {
        toast(defaultSuccessToast(success))
        return
      }

      const message = searchParams.get('message')
      if (message !== null) {
        toast(defaultSuccessToast(message))
        return
      }

      toast(
        defaultErrorToast(
          searchParams.get('error') ?? 'Failed to update e-mail.'
        )
      )
    }
  }, [searchParams, toast])

  if (!user || !showEmailSettings) return null

  function submitEmailChange(values: FormValues) {
    if (!canChangeEmail) return
    updateEmail({ email: values.email })
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(submitEmailChange)}
          className="w-full"
        >
          <Card className={cn('overflow-hidden border-b md:border', className)}>
            <CardHeader>
              <CardTitle>E-Mail</CardTitle>
              <CardDescription>
                {canChangeEmail
                  ? 'Update your e-mail address.'
                  : 'E-mail changes are currently unavailable.'}
              </CardDescription>
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
                        disabled={!canChangeEmail || isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>

            <CardFooter className="bg-bg-1 justify-between">
              <p className="text-fg-tertiary ">
                Has to be a valid e-mail address.
              </p>
              <Button
                loading={isPending ? 'Saving...' : undefined}
                disabled={
                  !canChangeEmail ||
                  isPending ||
                  form.watch('email') === user.email
                }
                type="submit"
                onClick={form.handleSubmit(submitEmailChange)}
              >
                Save
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      <ReauthDialog
        open={reauthDialogOpen}
        onOpenChange={setReauthDialogOpen}
      />
    </>
  )
}
