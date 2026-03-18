import { createBillingRepository } from '@/core/domains/billing/repository.server'
import { createBuildsRepository } from '@/core/domains/builds/repository.server'
import { createKeysRepository } from '@/core/domains/keys/repository.server'
import { createSandboxesRepository } from '@/core/domains/sandboxes/repository.server'
import { createSupportRepository } from '@/core/domains/support/repository.server'
import { createTeamsRepository } from '@/core/domains/teams/repository.server'
import { createTemplatesRepository } from '@/core/domains/templates/repository.server'
import { createWebhooksRepository } from '@/core/domains/webhooks/repository.server'

export interface RequestScope {
  accessToken: string
  teamId?: string
}

function buildRequestServices(scope: RequestScope) {
  const requireTeamScope = () => {
    if (!scope.teamId) {
      throw new Error('teamId is required in request scope')
    }

    return {
      accessToken: scope.accessToken,
      teamId: scope.teamId,
    }
  }

  return {
    teams: createTeamsRepository(scope),
    get builds() {
      return createBuildsRepository(requireTeamScope())
    },
    get sandboxes() {
      return createSandboxesRepository(requireTeamScope())
    },
    get templates() {
      return createTemplatesRepository(requireTeamScope())
    },
    get billing() {
      return createBillingRepository(requireTeamScope())
    },
    support: createSupportRepository(scope),
    get keys() {
      return createKeysRepository(requireTeamScope())
    },
    get webhooks() {
      return createWebhooksRepository(requireTeamScope())
    },
  }
}

export type RequestContextServices = ReturnType<typeof buildRequestServices>

export interface RequestContext {
  scope: RequestScope
  services: RequestContextServices
}

export function createRequestContext(scope: RequestScope): RequestContext {
  let services: RequestContextServices | undefined

  return {
    scope,
    get services() {
      services ??= buildRequestServices(scope)
      return services
    },
  }
}
