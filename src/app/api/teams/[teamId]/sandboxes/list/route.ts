import 'server-cli-only'

import { getTeamSandboxes } from '@/server/sandboxes/get-team-sandboxes'
import { SandboxesListResponse } from './types'

export async function GET(
  _req: Request,
  { params }: RouteContext<'/api/teams/[teamId]/sandboxes/list'>
) {
  try {
    const { teamId } = await params

    const response = await getTeamSandboxes({ teamIdOrSlug: teamId })

    if (response?.serverError) {
      throw response?.serverError || new Error('Failed to load sandboxes')
    }

    const data = response?.data || { sandboxes: [] }

    return Response.json(data satisfies SandboxesListResponse)
  } catch (error) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
