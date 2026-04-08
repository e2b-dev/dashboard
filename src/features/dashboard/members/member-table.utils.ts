import type { TeamMember } from '@/core/modules/teams/models'

// Returns the inviter member for a row. Example: ([alice, bob], bob.added_by=alice.id) -> alice.
const getAddedByMember = (
  allMembers: TeamMember[],
  addedById: string | null
): TeamMember | undefined => {
  if (!addedById) return undefined
  return allMembers.find((member) => member.info.id === addedById)
}

// Returns whether the row should be treated as system-added. Example: (bob, undefined) -> true.
const isSystemAddedMember = (
  member: TeamMember,
  addedByMember?: TeamMember
): boolean => !addedByMember || addedByMember.info.id === member.info.id

// Returns whether a row should render as a pending invite. Example: ({ name: undefined, providers: ['saml'] }) -> true.
const isPendingTeamMember = (member: TeamMember): boolean => {
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

// Returns whether remove should be shown. Example: (default member, current user) -> false.
const shouldShowRemoveMemberAction = (
  member: TeamMember,
  currentUserId?: string
): boolean => !member.relation.is_default && member.info.id !== currentUserId

export {
  getAddedByMember,
  isPendingTeamMember,
  isSystemAddedMember,
  shouldShowRemoveMemberAction,
}
