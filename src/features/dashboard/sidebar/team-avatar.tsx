import type { TeamModel } from '@/core/modules/teams/models'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'

interface TeamAvatarProps {
  team: TeamModel
  className?: string
  imageClassName?: string
}

export const TeamAvatar = ({
  team,
  className,
  imageClassName,
}: TeamAvatarProps) => {
  if (!team.profilePictureUrl) {
    return (
      <Avatar className={cn('size-9', className)}>
        <AvatarFallback className="bg-bg-hover border-0 text-fg-tertiary">
          {team.name?.charAt(0).toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
    )
  }

  return (
    <Avatar className={className}>
      <AvatarImage
        src={team.profilePictureUrl}
        className={cn('object-cover object-center', imageClassName)}
      />
    </Avatar>
  )
}
