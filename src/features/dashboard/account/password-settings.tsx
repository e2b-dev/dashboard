'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
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

const formSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    nonce: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof formSchema>

interface PasswordSettingsProps {
  className?: string
  showPasswordChangeForm: boolean
  isSessionFresh: boolean
}

export function PasswordSettings({
  className,
  showPasswordChangeForm,
  isSessionFresh,
}: PasswordSettingsProps) {
  'use no memo'

  const { user } = useDashboard()
  const { toast } = useToast()
  const trpc = useTRPC()
  const [reauthDialogOpen, setReauthDialogOpen] = useState(false)
  const [clientShowPasswordForm, setClientShowPasswordForm] = useState(
    showPasswordChangeForm || isSessionFresh
  )

  useEffect(() => {
    setClientShowPasswordForm(showPasswordChangeForm || isSessionFresh)
  }, [showPasswordChangeForm, isSessionFresh])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const { mutate: updatePassword, isPending } = useMutation(
    trpc.user.update.mutationOptions({
      onSuccess: (data) => {
        if (data.status === 'reauth') {
          setReauthDialogOpen(true)
          return
        }

        if (data.status === 'error') {
          if (data.code === 'account_credentials_not_changeable') {
            toast(defaultErrorToast(USER_MESSAGES.failedUpdatePassword.message))
            return
          }

          const message =
            data.code === 'same_password'
              ? 'New password cannot be the same as the old password.'
              : 'Password is too weak.'
          form.setError('confirmPassword', { message })
          return
        }

        toast(defaultSuccessToast(USER_MESSAGES.passwordUpdated.message))

        form.reset()
        setClientShowPasswordForm(false)
        window.history.replaceState({}, '', window.location.pathname)
      },
      onError: () => {
        toast(defaultErrorToast(USER_MESSAGES.failedUpdatePassword.message))
      },
    })
  )

  function onSubmit(values: FormValues) {
    updatePassword({ password: values.password })
  }

  function handleChangePassword() {
    if (isSessionFresh) {
      setClientShowPasswordForm(true)
      return
    }

    setReauthDialogOpen(true)
  }

  if (!user || !user.canChangePassword) return null

  return (
    <>
      <Card className={cn('overflow-hidden md:border', className)}>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your account password.</CardDescription>
        </CardHeader>

        <CardContent className="relative flex w-full max-w-90 flex-col gap-2">
          {clientShowPasswordForm ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
                <div className="flex flex-col gap-2">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="New password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirm password"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                form.handleSubmit(onSubmit)()
                              }
                            }}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          ) : (
            <>
              {!isSessionFresh && (
                <p className="text-fg-secondary text-md">
                  To change your password, you'll need to re-authenticate for
                  security.
                </p>
              )}
              <Button
                type="button"
                onClick={handleChangePassword}
                className="mt-2 w-fit"
              >
                Change Password
              </Button>
            </>
          )}
        </CardContent>

        {clientShowPasswordForm && (
          <CardFooter className="bg-bg-1 justify-between gap-6">
            <p className="text-fg-tertiary ">
              Your password must be at least 8 characters long.
            </p>
            <Button
              type="submit"
              loading={isPending ? 'Updating...' : undefined}
              onClick={form.handleSubmit(onSubmit)}
              disabled={isPending || !form.formState.isValid}
            >
              Update password
            </Button>
          </CardFooter>
        )}
      </Card>

      <ReauthDialog
        open={reauthDialogOpen}
        onOpenChange={setReauthDialogOpen}
      />
    </>
  )
}
