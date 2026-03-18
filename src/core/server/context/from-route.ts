import { createRequestContext } from './request-context'

export function createRouteServices(input: {
  accessToken: string
  teamId?: string
}) {
  return createRequestContext({
    accessToken: input.accessToken,
    teamId: input.teamId,
  }).services
}
