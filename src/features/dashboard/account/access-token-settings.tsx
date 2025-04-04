'use client'

import { forgotPasswordAction } from '@/server/auth/auth-actions'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { Button } from '@/ui/primitives/button'
import { useUser } from '@/lib/hooks/use-user'
import { cn } from '@/lib/utils'
import { useAction } from 'next-safe-action/hooks'
import {
  defaultSuccessToast,
  defaultErrorToast,
  useToast,
} from '@/lib/hooks/use-toast'
import UserAccessToken from './user-access-token'

interface AccessTokenSettingsProps {
  className?: string
}

export function AccessTokenSettings({ className }: AccessTokenSettingsProps) {
  const { user } = useUser()
  const { toast } = useToast()

  const { execute: forgotPassword, isExecuting: isForgotPasswordPending } =
    useAction(forgotPasswordAction, {
      onSuccess: () => {
        toast(defaultSuccessToast('Password reset e-mail sent.'))
      },
      onError: ({ error }) => {
        toast(
          defaultErrorToast(error.serverError || 'Failed to reset password.')
        )
      },
    })

  if (!user) return null

  return (
    <Card className={cn('overflow-hidden rounded-xs border', className)}>
      <CardHeader>
        <CardTitle>Access Token</CardTitle>
        <CardDescription>Manage your personal access token.</CardDescription>
      </CardHeader>

      <CardContent>
        <UserAccessToken className="max-w-lg" />
      </CardContent>

      <CardFooter className="bg-bg-100 justify-between gap-6">
        <p className="text-fg-500 text-sm">
          Keep it safe, as it can be used to authenticate with E2B services.
        </p>
      </CardFooter>
    </Card>
  )
}
