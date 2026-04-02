import { context, SpanStatusCode, trace } from '@opentelemetry/api'
import type { Session, User } from '@supabase/supabase-js'
import { unauthorized } from 'next/navigation'
import { createMiddleware, createSafeActionClient } from 'next-safe-action'
import { z } from 'zod'
import {
  getObservedException,
  getObservedError,
  getObservedErrorMessage,
} from '@/core/server/adapters/error-observability'
import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import getUserByToken from '@/core/server/functions/auth/get-user-by-token'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { createClient } from '@/core/shared/clients/supabase/server'
import { getTracer } from '@/core/shared/clients/tracer'
import { UnauthenticatedError, UnknownError } from '@/core/shared/errors'
import type {
  RequestScope,
  TeamRequestScope,
} from '@/core/shared/repository-scope'
import { ActionError, flattenClientInputValue } from './utils'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export interface AuthActionContext {
  user: User
  session: Session
  supabase: SupabaseServerClient
}

export interface TeamActionContext extends AuthActionContext {
  teamId: string
}

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    const s = trace.getActiveSpan()
    const observedError = getObservedError(e)
    const observedErrorMessage = getObservedErrorMessage(e)

    s?.setStatus({
      code: SpanStatusCode.ERROR,
      message: observedErrorMessage,
    })
    s?.recordException(getObservedException(e))

    if (e instanceof ActionError) {
      const payload = {
        key: e.expected
          ? 'action_client:expected_server_error'
          : 'action_client:unexpected_server_error',
        public_message: e.message,
        error: serializeErrorForLog(observedError),
        transport_error:
          observedError === e ? undefined : serializeErrorForLog(e),
      }

      if (e.expected) {
        l.warn(payload, observedErrorMessage)
      } else {
        l.error(payload, observedErrorMessage)
      }

      return e.message
    }

    const sE = serializeErrorForLog(observedError) as {
      code?: string
      name?: string
      message?: string
    }

    l.error(
      {
        key: 'action_client:unexpected_server_error',
        error: sE,
      },
      `${sE.name && `${sE.name}: `} ${observedErrorMessage}`
    )

    return UnknownError().message
  },
  defineMetadataSchema() {
    return z
      .object({
        actionName: z.string().optional(),
        serverFunctionName: z.string().optional(),
      })
      .refine((data) => {
        if (!data.actionName && !data.serverFunctionName) {
          return 'actionName or serverFunctionName is required in definition metadata'
        }
        return true
      })
  },
  defaultValidationErrorsShape: 'flattened',
}).use(async ({ next, clientInput, metadata }) => {
  const t = getTracer()

  const actionOrFunctionName =
    metadata?.serverFunctionName || metadata?.actionName || 'Unknown action'

  const type = metadata?.serverFunctionName ? 'function' : 'action'
  const name = actionOrFunctionName

  const s = t.startSpan(`${type}:${name}`)

  const startTime = performance.now()

  const result = await context.with(
    trace.setSpan(context.active(), s),
    async () => {
      return next()
    }
  )

  const duration = performance.now() - startTime

  const baseLogPayload = {
    server_function_type: type,
    server_function_name: name,
    server_function_input: clientInput,
    server_function_duration_ms: duration.toFixed(3),
    team_id: flattenClientInputValue(clientInput, 'teamId'),
    template_id: flattenClientInputValue(clientInput, 'templateId'),
    sandbox_id: flattenClientInputValue(clientInput, 'sandboxId'),
    user_id: flattenClientInputValue(clientInput, 'userId'),
  }

  s.setAttribute('server_function_type', type)
  s.setAttribute('server_function_name', name)
  s.setAttribute(
    'server_function_duration_ms',
    baseLogPayload.server_function_duration_ms
  )
  if (baseLogPayload.team_id) {
    s.setAttribute('team_id', baseLogPayload.team_id)
  }
  if (baseLogPayload.template_id) {
    s.setAttribute('template_id', baseLogPayload.template_id)
  }
  if (baseLogPayload.sandbox_id) {
    s.setAttribute('sandbox_id', baseLogPayload.sandbox_id)
  }
  if (baseLogPayload.user_id) {
    s.setAttribute('user_id', baseLogPayload.user_id)
  }

  const serverError = result.serverError
  const validationErrors = result.validationErrors
  const error = serverError || validationErrors

  if (error) {
    s.setStatus({ code: SpanStatusCode.ERROR })
    s.recordException(getObservedException(error))

    const sE = serializeErrorForLog(error) as
      | string
      | {
          code?: string
          name?: string
          message?: string
        }

    l.warn(
      {
        key: validationErrors
          ? 'action_client:validation_failure'
          : 'action_client:failure',
        ...baseLogPayload,
        error: sE,
      },
      `${type} ${name} failed in ${baseLogPayload.server_function_duration_ms}ms: ${typeof sE === 'string' ? sE : ((sE.name || sE.code) && `${sE.name || sE.code}: ${sE.message}`) || 'Unknown error'}`
    )
  } else {
    s.setStatus({ code: SpanStatusCode.OK })

    l.info(
      {
        key: `action_client:success`,
        ...baseLogPayload,
      },
      `${type} ${name} succeeded in ${baseLogPayload.server_function_duration_ms}ms`
    )
  }

  s.end()

  return result
})

export const authActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient()
  const session = await getSessionInsecure(supabase)

  if (!session) {
    throw UnauthenticatedError()
  }

  const {
    data: { user },
  } = await getUserByToken(session.access_token)

  if (!user || !session) {
    throw UnauthenticatedError()
  }

  return next({
    ctx: {
      user,
      session,
      supabase,
    },
  })
})

export const withTeamSlugResolution = createMiddleware<{
  ctx: AuthActionContext
}>().define(async ({ next, clientInput, ctx }) => {
  if (
    !clientInput ||
    typeof clientInput !== 'object' ||
    !('teamSlug' in clientInput)
  ) {
    l.error(
      {
        key: 'with_team_slug_resolution:missing_team_slug',
        context: {
          teamSlug: (clientInput as { teamSlug?: string })?.teamSlug,
        },
      },
      'Missing teamSlug when using withTeamSlugResolution middleware'
    )

    throw new Error(
      'teamSlug is required when using withTeamSlugResolution middleware'
    )
  }

  const teamId = await getTeamIdFromSlug(
    clientInput.teamSlug as string,
    ctx.session.access_token
  )

  if (!teamId) {
    l.warn(
      {
        key: 'with_team_slug_resolution:invalid_team_slug',
        context: {
          teamSlug: clientInput.teamSlug,
        },
      },
      `with_team_slug_resolution:invalid_team_slug - invalid team slug provided through withTeamSlugResolution middleware: ${clientInput.teamSlug}`
    )

    throw unauthorized()
  }

  return next({
    ctx: {
      teamId,
    },
  })
})

export function withAuthedRequestRepository<
  TRepository,
  TContextExtension extends object,
>(
  createRepository: (scope: RequestScope) => TRepository,
  extendContext: (repository: TRepository) => TContextExtension
) {
  return createMiddleware<{
    ctx: AuthActionContext
  }>().define(async ({ next, ctx }) => {
    const repository = createRepository({
      accessToken: ctx.session.access_token,
    })

    return next({
      ctx: {
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
  return createMiddleware<{
    ctx: TeamActionContext
  }>().define(async ({ next, ctx }) => {
    const repository = createRepository({
      accessToken: ctx.session.access_token,
      teamId: ctx.teamId,
    })

    return next({
      ctx: {
        ...extendContext(repository),
      },
    })
  })
}
