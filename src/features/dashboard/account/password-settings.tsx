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
import { Input } from '@/ui/primitives/input'
import { useUser } from '@/lib/hooks/use-user'
import { cn } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { useToast } from '@/lib/hooks/use-toast'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/ui/primitives/form'
import { defaultSuccessToast, defaultErrorToast } from '@/lib/hooks/use-toast'

const formSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof formSchema>

interface PasswordSettingsProps {
  className?: string
}

export function PasswordSettings({ className }: PasswordSettingsProps) {
  'use no memo'

  const { user } = useUser()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const { execute: updatePassword, isPending } = useAction(updateUserAction, {
    onSuccess: () => {
      toast(defaultSuccessToast('Password updated.'))
      form.reset()
    },
    onError: ({ error }) => {
      if (error.validationErrors?.fieldErrors?.password) {
        form.setError('confirmPassword', {
          message: error.validationErrors.fieldErrors.password?.[0],
        })
      } else {
        toast(
          defaultErrorToast(error.serverError || 'Failed to update password.')
        )
      }
    },
  })

  function onSubmit(values: FormValues) {
    updatePassword({ password: values.password })
  }

  if (!user) return null

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        <Card className={cn('overflow-hidden rounded-xs border', className)}>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your account password.</CardDescription>
          </CardHeader>

          <CardContent className="flex w-full max-w-90 flex-col gap-2">
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
          </CardContent>
          <CardFooter className="bg-bg-100 justify-between gap-6">
            <p className="text-fg-500 text-sm">
              Your password must be at least 8 characters long.
            </p>
            <Button
              type="submit"
              loading={isPending}
              onClick={form.handleSubmit(onSubmit)}
              disabled={isPending || !form.formState.isValid}
            >
              Update password
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
