import { unauthorizedUserError } from '@/core/server/adapters/errors'
import { t } from '@/core/server/trpc/init'
import type { RequestScope } from '@/core/shared/repository-scope'

export function withAuthedRequestRepository<
  TRepository,
  TContextExtension extends object,
>(
  createRepository: (scope: RequestScope) => TRepository,
  extendContext: (repository: TRepository) => TContextExtension
) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.apiKey) {
      throw unauthorizedUserError()
    }

    const repository = createRepository({
      apiKey: ctx.apiKey,
    })

    return next({
      ctx: {
        ...ctx,
        apiKey: ctx.apiKey,
        ...extendContext(repository),
      },
    })
  })
}
