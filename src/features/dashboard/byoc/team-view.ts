type TeamView = {
  version?: 1 | 2
  actions?: Array<{
    id: string
    label: string
    enabled: boolean
    operation_id?: string
  }>
}

export function findTeamViewAction(view: TeamView | undefined, id: string) {
  return view?.actions?.find((action) => action.id === id)
}

export function findRetryTeamViewAction(view: TeamView | undefined) {
  return view?.actions?.find((action) => action.id.startsWith('retry_'))
}

export function canExecuteRetryTeamViewAction(view: TeamView | undefined) {
  const action = findRetryTeamViewAction(view)
  if (!action?.enabled) return false
  if (action.operation_id) return true
  return (
    view?.version === 1 &&
    ['retry_deploy', 'retry_validate', 'retry_destroy'].includes(action.id)
  )
}
