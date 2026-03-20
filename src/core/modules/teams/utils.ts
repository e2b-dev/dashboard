import type { TeamModel } from './models'

export function getTransformedDefaultTeamName(
  team: Pick<TeamModel, 'email' | 'isDefault' | 'name'>
): string | null {
  if (!team.isDefault || team.name !== team.email) {
    return null
  }

  const [username] = team.email.split('@')
  if (!username) {
    return null
  }

  return `${username.charAt(0).toUpperCase()}${username.slice(1)}'s Team`
}

export function getTeamDisplayName(
  team: Pick<TeamModel, 'email' | 'isDefault' | 'name'>
): string {
  return getTransformedDefaultTeamName(team) ?? team.name
}
