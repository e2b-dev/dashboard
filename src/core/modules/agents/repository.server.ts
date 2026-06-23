import 'server-only'

import { authHeaders } from '@/configs/api'
import { api } from '@/core/shared/clients/api'
import { repoErrorFromHttp } from '@/core/shared/errors'
import type { TeamRequestScope } from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'
import type { AgentTemplateConfig } from '@/features/dashboard/agents/config'

type AgentsRepositoryDeps = {
  apiClient: typeof api
  authHeaders: typeof authHeaders
}

export interface AgentsRepository {
  listAgents(): Promise<RepoResult<{ agents: AgentTemplateConfig[] }>>
}

function mapIcon(icon: string): AgentTemplateConfig['icon'] {
  switch (icon) {
    case 'si:claude':
    case 'claude':
      return 'claude'
    case 'si:openai':
    case 'openai':
      return 'openai'
    default:
      return 'open'
  }
}

export function createAgentsRepository(
  scope: TeamRequestScope,
  deps: AgentsRepositoryDeps = {
    apiClient: api,
    authHeaders,
  }
): AgentsRepository {
  return {
    async listAgents() {
      const res = await deps.apiClient.GET('/agents', {
        headers: deps.authHeaders(scope.accessToken, scope.teamId),
      })

      if (!res.response.ok || res.error) {
        return err(
          repoErrorFromHttp(
            res.response.status,
            res.error?.message ?? 'Failed to fetch agents',
            res.error
          )
        )
      }

      const agents = (res.data?.agents ?? []).map((agent) => ({
        id: agent.id,
        name: agent.name,
        command: agent.command,
        template: agent.template,
        icon: mapIcon(agent.icon),
        description: agent.description,
      }))

      return ok({ agents })
    },
  }
}
