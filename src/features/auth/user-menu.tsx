'use client'

import { Button } from '@/ui/primitives/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { signOutAction } from '@/server/auth/auth-actions'
import Link from 'next/link'
import { PROTECTED_URLS } from '@/configs/urls'
import UserDetailsTile from './user-details-tile'
import { useUser } from '@/lib/hooks/use-user'

export default function UserMenu() {
  const { user } = useUser()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="iconSm"
            className="min-h-8 min-w-8 cursor-pointer before:absolute before:inset-0 before:z-10 before:bg-black/30 before:content-['']"
            variant="ghost"
            asChild
          >
            <Avatar>
              <AvatarImage src={user?.user_metadata.avatar_url} />
              <AvatarFallback>
                {user?.email?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild className="p-1">
            <Link href={PROTECTED_URLS.ACCOUNT_SETTINGS}>
              <UserDetailsTile />
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-error"
            onClick={() => signOutAction()}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
