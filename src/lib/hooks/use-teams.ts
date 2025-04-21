import { useServerContext } from './use-server-context'

export const useTeams = () => {
  const { teams } = useServerContext()

  return { teams }
}

export const useSelectedTeam = () => {
  const { selectedTeam } = useServerContext()

  return selectedTeam
}
