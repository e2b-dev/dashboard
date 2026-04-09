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

const isPendingInvite = (member: TeamMember): boolean => {
  const hasRecognizedProvider = member.info.providers?.some((provider) => {
    const value = provider.toLowerCase()
    return (
      value.includes('google') ||
      value.includes('github') ||
      value.includes('email')
    )
  })

  return !hasRecognizedProvider && !member.info.name
}

const shouldShowRemoveMemberAction = (
  member: TeamMember,
  currentUserId?: string
): boolean => !member.relation.is_default && member.info.id !== currentUserId

export { getAddedByMember, isPendingInvite, shouldShowRemoveMemberAction, wasAddedBySystem }
