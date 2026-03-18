import { context, SpanStatusCode, trace } from '@opentelemetry/api'
import type { Session, User } from '@supabase/supabase-js'
import { unauthorized } from 'next/navigation'
import { createMiddleware, createSafeActionClient } from 'next-safe-action'
import { serializeError } from 'serialize-error'
import { z } from 'zod'
import {
  createRequestContext,
  type RequestContextServices,
} from '@/core/server/context/request-context'
import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import getUserByToken from '@/core/server/functions/auth/get-user-by-token'
import { getTeamIdFromSegment } from '@/core/server/functions/team/get-team-id-from-segment'
import { UnauthenticatedError, UnknownError } from '@/core/shared/errors'
import { l } from '@/core/shared/clients/logger/logger'
import { createClient } from '@/core/shared/clients/supabase/server'
import { getTracer } from '@/core/shared/clients/tracer'
import { ActionError, flattenClientInputValue } from './utils'

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    const s = trace.getActiveSpan()

    s?.setStatus({ code: SpanStatusCode.ERROR })
    s?.recordException(e)

    if (e instanceof ActionError) {
      return e.message
    }

    const sE = serializeError(e)

    l.error(
      {
        key: 'action_client:unexpected_server_error',
        error: sE,
      },
      `${sE.name && `${sE.name}: `} ${sE.message || 'Unknown error'}`
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

  const error = result.serverError || result.validationErrors

  if (error) {
    s.setStatus({ code: SpanStatusCode.ERROR })
    s.recordException(error)

    const sE = serializeError(error)

    l.error(
      {
        key: 'action_client:failure',
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

  if (!session) {
    throw UnauthenticatedError()
  }

  return next({
    ctx: {
      user,
      session,
      supabase,
      services: createRequestContext({
        accessToken: session.access_token,
      }).services,
    },
  })
})

export const withTeamIdResolution = createMiddleware<{
  ctx: {
    user: User
    session: Session
    supabase: Awaited<ReturnType<typeof createClient>>
    services: RequestContextServices
  }
}>().define(async ({ next, clientInput, ctx }) => {
  if (
    !clientInput ||
    typeof clientInput !== 'object' ||
    !('teamIdOrSlug' in clientInput)
  ) {
    l.error(
      {
        key: 'with_team_id_resolution:missing_team_id_or_slug',
        context: {
          teamIdOrSlug: (clientInput as { teamIdOrSlug?: string })
            ?.teamIdOrSlug,
        },
      },
      'Missing teamIdOrSlug when using withTeamIdResolution middleware'
    )

    throw new Error(
      'teamIdOrSlug is required when using withTeamIdResolution middleware'
    )
  }

  const teamId = await getTeamIdFromSegment(
    clientInput.teamIdOrSlug as string,
    ctx.session.access_token
  )

  if (!teamId) {
    l.warn(
      {
        key: 'with_team_id_resolution:invalid_team_id_or_slug',
        context: {
          teamIdOrSlug: clientInput.teamIdOrSlug,
        },
      },
      `with_team_id_resolution:invalid_team_id_or_slug - invalid team id or slug provided through withTeamIdResolution middleware: ${clientInput.teamIdOrSlug}`
    )

    throw unauthorized()
  }

  return next({
    ctx: {
      teamId,
      services: createRequestContext({
        accessToken: ctx.session.access_token,
        teamId,
      }).services,
    },
  })
})
