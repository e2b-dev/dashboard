import { useServerContext } from '../../features/dashboard/server-context'

export const useTeams = () => {
  const { teams } = useServerContext()

  return { teams }
}

export const useSelectedTeam = () => {
  const { selectedTeam } = useServerContext()

  return selectedTeam
}
