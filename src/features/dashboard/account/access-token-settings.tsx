'use client'

import Link from 'next/link'
import { HELP_URLS, PROTECTED_URLS } from '@/configs/urls'
import { useFeatureFlag } from '@/core/modules/feature-flags/feature-flags.client'
import { cn } from '@/lib/utils'
import { Badge } from '@/ui/primitives/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { ChevronRightIcon, KeyIcon } from '@/ui/primitives/icons'
import { useDashboard } from '../context'
import UserAccessToken from './user-access-token'

interface AccessTokenSettingsProps {
  className?: string
}

export function AccessTokenSettings({ className }: AccessTokenSettingsProps) {
  const { user, team } = useDashboard()
  const provisioningDisabled = useFeatureFlag(
    'disableE2BAccessTokenProvisioning'
  )

  if (!user) return null

  return (
    <Card className={cn('overflow-hidden border-b md:border', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Access Token
          {provisioningDisabled && <Badge>Deprecated</Badge>}
        </CardTitle>
        <CardDescription>Manage your personal access token.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <UserAccessToken className="max-w-lg" disabled={provisioningDisabled} />

        {provisioningDisabled && (
          <p className="text-fg-tertiary max-w-lg leading-relaxed">
            Access tokens are deprecated and will stop working on August 1,
            2026.
            <br />
            Use an API key instead.{' '}
            <a
              href={HELP_URLS.ACCESS_TOKEN_DEPRECATION}
              target="_blank"
              rel="noopener"
              className="text-fg underline underline-offset-2 hover:opacity-80"
            >
              Learn more
            </a>
            .
          </p>
        )}
      </CardContent>

      {provisioningDisabled ? (
        <CardFooter className="bg-bg-1 p-0">
          <Link
            href={PROTECTED_URLS.KEYS(team.slug)}
            className="group hover:bg-bg-hover flex w-full items-center justify-between gap-3 px-6 py-4 transition-colors"
          >
            <span className="flex items-center gap-2">
              <KeyIcon className="text-icon-tertiary size-4" />
              <span className="prose-body-highlight text-fg">
                Use API keys instead
              </span>
            </span>
            <ChevronRightIcon className="text-icon-tertiary size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </CardFooter>
      ) : (
        <CardFooter className="bg-bg-1 justify-between gap-6">
          <p className="text-fg-tertiary">
            Keep it safe, as it can be used to authenticate with E2B services.
          </p>
        </CardFooter>
      )}
    </Card>
  )
}
