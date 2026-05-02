'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { getUserAccessTokenAction } from '@/core/server/actions/user-actions'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import CopyButton from '@/ui/copy-button'
import { IconButton } from '@/ui/primitives/icon-button'
import { EyeIcon, EyeOffIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { Loader } from '@/ui/primitives/loader'

interface UserAccessTokenProps {
  className?: string
}

export default function UserAccessToken({ className }: UserAccessTokenProps) {
  const { toast } = useToast()
  const [token, setToken] = useState<string>()
  const [isVisible, setIsVisible] = useState(false)

  const { execute: fetchToken, isPending } = useAction(
    getUserAccessTokenAction,
    {
      onSuccess: (result) => {
        if (result.data) {
          setToken(result.data.token)
          setIsVisible(true)
        }
      },
      onError: () => {
        toast(defaultErrorToast('Failed to fetch access token'))
      },
    }
  )

  return (
    <div className={className}>
      <div className="flex gap-1 items-center">
        <Input
          type={isVisible ? 'text' : 'password'}
          value={token ?? '••••••••••••••••'}
          readOnly
          className="bg-bg-1 font-mono"
        />
        <IconButton
          type="button"
          variant="secondary"
          onClick={() => {
            if (token) {
              setIsVisible(!isVisible)
              setToken(undefined)
            } else {
              fetchToken()
            }
          }}
          disabled={isPending}
        >
          {isPending ? (
            <Loader variant="square" size="lg" />
          ) : token ? (
            isVisible ? (
              <EyeOffIcon />
            ) : (
              <EyeIcon />
            )
          ) : (
            <EyeIcon />
          )}
        </IconButton>
        <CopyButton variant="secondary" value={token ?? ''} disabled={!token} />
      </div>
    </div>
  )
}
