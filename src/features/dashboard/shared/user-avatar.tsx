'use client'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'

interface UserAvatarProps {
  label?: string | null
  url?: string | null
  className?: string
}

export const UserAvatar = ({ label, url, className }: UserAvatarProps) => (
  <Avatar className={cn('border-stroke size-5 shrink-0 border', className)}>
    <AvatarImage referrerPolicy="no-referrer" src={url ?? undefined} />
    <AvatarFallback className="bg-bg text-[10px] font-bold uppercase">
      {label?.charAt(0).toUpperCase() ?? '?'}
    </AvatarFallback>
  </Avatar>
)
