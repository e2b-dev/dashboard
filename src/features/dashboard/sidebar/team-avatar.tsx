import type { TeamModel } from '@/core/modules/teams/models'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar'

interface TeamAvatarProps {
  team: TeamModel
  classNames?: {
    root?: string
    image?: string
  }
}

export const TeamAvatar = ({ team, classNames }: TeamAvatarProps) => {
  if (!team.profilePictureUrl) {
    return (
      <Avatar className={cn('size-9', classNames?.root)}>
        <AvatarFallback className="bg-bg-hover border-0 text-fg-tertiary">
          {team.name?.charAt(0).toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
    )
  }

  return (
    <Avatar className={classNames?.root}>
      <AvatarImage
        src={team.profilePictureUrl}
        className={cn('object-cover object-center', classNames?.image)}
      />
    </Avatar>
  )
}
