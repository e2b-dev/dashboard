'use client'

import { useUser } from '@/lib/hooks/use-user'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import UserAccessToken from './user-access-token'

interface AccessTokenSettingsProps {
  className?: string
}

export function AccessTokenSettings({ className }: AccessTokenSettingsProps) {
  const { user } = useUser()

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
