import {
  forbiddenTeamAccessError,
  unauthorizedUserError,
} from '@/core/server/adapters/trpc-errors'
import { t } from '@/core/server/trpc/init'
import type {
  RequestScope,
  TeamRequestScope,
} from '@/core/shared/repository-scope'

export function withAuthedRequestRepository<
  TRepository,
  TContextExtension extends object,
>(
  createRepository: (scope: RequestScope) => TRepository,
  extendContext: (repository: TRepository) => TContextExtension
) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.session) {
      throw unauthorizedUserError()
    }

    if (!ctx.user) {
      throw unauthorizedUserError()
    }

    const repository = createRepository({
      accessToken: ctx.session.access_token,
    })

    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
        user: ctx.user,
        ...extendContext(repository),
      },
    })
  })
}

export function withTeamAuthedRequestRepository<
  TRepository,
  TContextExtension extends object,
>(
  createRepository: (scope: TeamRequestScope) => TRepository,
  extendContext: (repository: TRepository) => TContextExtension
) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.session) {
      throw unauthorizedUserError()
    }

    if (!ctx.user) {
      throw unauthorizedUserError()
    }

    if (!ctx.teamId) {
      throw forbiddenTeamAccessError()
    }

    const repository = createRepository({
      accessToken: ctx.session.access_token,
      teamId: ctx.teamId,
    })

    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
        user: ctx.user,
        teamId: ctx.teamId,
        ...extendContext(repository),
      },
    })
  })
}
