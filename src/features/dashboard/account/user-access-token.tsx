'use client'

import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { getUserAccessTokenAction } from '@/server/user/user-actions'
import CopyButton from '@/ui/copy-button'
import { IconButton } from '@/ui/primitives/icon-button'
import { Input } from '@/ui/primitives/input'
import { Loader } from '@/ui/primitives/loader_d'
import { Eye, EyeOff } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'

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
            <Loader />
          ) : token ? (
            isVisible ? (
              <EyeOff />
            ) : (
              <Eye />
            )
          ) : (
            <Eye />
          )}
        </IconButton>
        <CopyButton
          variant="secondary"
          value={token ?? ''}
          disabled={!token}
        />
      </div>
    </div>
  )
}
