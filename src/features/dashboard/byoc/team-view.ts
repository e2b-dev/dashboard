type TeamView = {
  actions?: Array<{
    id: string
    label: string
    enabled: boolean
  }>
}

export function findTeamViewAction(view: TeamView | undefined, id: string) {
  return view?.actions?.find((action) => action.id === id)
}

export function findRetryTeamViewAction(view: TeamView | undefined) {
  return view?.actions?.find((action) => action.id.startsWith('retry_'))
}
