import type { TeamMember } from '@/core/modules/teams/models'

const getAddedByMember = (
  allMembers: TeamMember[],
  addedById: string | null
): TeamMember | undefined => {
  if (!addedById) return undefined
  return allMembers.find((member) => member.info.id === addedById)
}

const wasAddedBySystem = (
  member: TeamMember,
  addedByMember?: TeamMember
): boolean => !addedByMember || addedByMember.info.id === member.info.id

const shouldShowRemoveMemberAction = (
  member: TeamMember,
  currentUserId?: string
): boolean => !member.relation.is_default && member.info.id !== currentUserId

export { getAddedByMember, shouldShowRemoveMemberAction, wasAddedBySystem }
