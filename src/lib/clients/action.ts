import { UnknownError } from '@/types/errors'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import { createSafeActionClient } from 'next-safe-action'
import { serializeError } from 'serialize-error'
import { z } from 'zod'
import { ActionError, flattenClientInputValue } from '../utils/action'
import { checkAuthenticated } from '../utils/server'
import { l } from './logger'
import { getTracer } from './tracer'

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
      { key: 'action_client:unexpected_server_error', error: sE },
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

  const result = await next()

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

  s.setAttribute('action_type', type)
  s.setAttribute('action_name', name)
  s.setAttribute('duration_ms', baseLogPayload.server_function_duration_ms)
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

  const error =
    result.serverError || result.validationErrors || result.success === false

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
      `${type} ${name} failed in ${baseLogPayload.server_function_duration_ms}ms: ${typeof sE === 'string' ? sE : ((sE.name || sE.code) && `${sE.name || sE.code}: ` + sE.message) || 'Unknown error'}`
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
  const { user, session, supabase } = await checkAuthenticated()

  return next({ ctx: { user, session, supabase } })
})
