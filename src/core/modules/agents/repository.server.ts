import type { AgentTemplateConfig } from '@/configs/agents'
import { authHeaders } from '@/configs/api'
import { api } from '@/core/shared/clients/api'
import type { components as DashboardComponents } from '@/core/shared/contracts/dashboard-api.types'
import { repoErrorFromHttp } from '@/core/shared/errors'
import type { TeamRequestScope } from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'

type DashboardAgent = DashboardComponents['schemas']['Agent']

type AgentsRepositoryDeps = {
  apiClient: typeof api
  authHeaders: typeof authHeaders
}

export type AgentsRepository = {
  getAgents(): Promise<RepoResult<AgentTemplateConfig[]>>
}

const toAgentTemplateConfig = (agent: DashboardAgent): AgentTemplateConfig => ({
  id: agent.id,
  teamId: agent.teamId ?? null,
  name: agent.name,
  command: agent.command ?? undefined,
  template: agent.template,
  description: agent.description,
  author: agent.author ?? undefined,
  public: agent.public,
  createdAt: agent.createdAt,
  updatedAt: agent.updatedAt,
  deletedAt: agent.deletedAt,
})

export function createAgentsRepository(
  scope: TeamRequestScope,
  deps: AgentsRepositoryDeps = {
    apiClient: api,
    authHeaders,
  }
): AgentsRepository {
  return {
    async getAgents() {
      const { data, error, response } = await deps.apiClient.GET('/agents', {
        headers: deps.authHeaders(scope.accessToken, scope.teamId),
        next: { revalidate: 60 },
      })

      if (!response.ok || error) {
        return err(
          repoErrorFromHttp(
            response.status,
            error?.message ?? 'Failed to fetch agents',
            error
          )
        )
      }

      return ok((data?.agents ?? []).map(toAgentTemplateConfig))
    },
  }
}
