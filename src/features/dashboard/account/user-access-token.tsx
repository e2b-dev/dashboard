'use client'

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import CopyButton from '@/ui/copy-button'
import { IconButton } from '@/ui/primitives/icon-button'
import { EyeClosedIcon, EyeOpenIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { Loader } from '@/ui/primitives/loader'

interface UserAccessTokenProps {
  className?: string
}

export default function UserAccessToken({ className }: UserAccessTokenProps) {
  const { toast } = useToast()
  const trpc = useTRPC()
  const [token, setToken] = useState<string>()
  const [isVisible, setIsVisible] = useState(false)

  const { mutate: fetchToken, isPending } = useMutation(
    trpc.user.createAccessToken.mutationOptions({
      onSuccess: (data) => {
        if (data?.token) {
          setToken(data.token)
          setIsVisible(true)
        }
      },
      onError: () => {
        toast(defaultErrorToast('Failed to fetch access token'))
      },
    })
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
              <EyeClosedIcon />
            ) : (
              <EyeOpenIcon />
            )
          ) : (
            <EyeOpenIcon />
          )}
        </IconButton>
        <CopyButton variant="secondary" value={token ?? ''} disabled={!token} />
      </div>
    </div>
  )
}
