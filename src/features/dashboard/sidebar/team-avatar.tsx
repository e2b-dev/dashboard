import type { TeamModel } from '@/core/modules/teams/models'
import { cn } from '@/lib/utils'
import { PatternAvatar } from '@/ui/primitives/avatar'

interface TeamAvatarProps {
  team: TeamModel
  classNames?: {
    root?: string
  }
}

export const TeamAvatar = ({ team, classNames }: TeamAvatarProps) => {
  return (
    <PatternAvatar
      className={cn('size-9 [&>svg]:!size-full', classNames?.root)}
      letter={team.name}
    />
  )
}
