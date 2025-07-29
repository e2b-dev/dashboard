import { UnknownError } from '@/types/errors'
import { SpanStatusCode } from '@opentelemetry/api'
import { createSafeActionClient } from 'next-safe-action'
import { serializeError } from 'serialize-error'
import { z } from 'zod'
import { ActionError } from '../utils/action'
import { checkAuthenticated } from '../utils/server'
import { l } from './logger'
import { tracer } from './otel'

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    const t = tracer()
    const s = t.startSpan('action_client')

    s.setStatus({ code: SpanStatusCode.ERROR })
    s.recordException(e)

    if (e instanceof ActionError) {
      return e.message
    }

    l.error({
      key: 'action_client:unexpected_server_error',
      error: serializeError(e),
    })

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
  const t = tracer()
  const s = t.startSpan('action_client')

  const startTime = performance.now()

  const result = await next()

  const actionOrFunctionName =
    metadata?.serverFunctionName || metadata?.actionName || 'Unknown action'

  const duration = performance.now() - startTime

  const type = metadata?.serverFunctionName ? 'function' : 'action'
  const name = actionOrFunctionName

  const logPayload = {
    input: clientInput,
    durationMs: duration.toFixed(2),
  }

  s.setAttribute('type', type)
  s.setAttribute('name', name)
  s.setAttribute('duration_ms', logPayload.durationMs)

  const error =
    result.serverError || result.validationErrors || result.success === false

  if (error) {
    s.setStatus({ code: SpanStatusCode.ERROR })
    s.recordException(error)

    l.error({
      key: 'action_client:failure',
      type,
      name,
      error: serializeError(error),
      meta: logPayload,
    })
  } else {
    s.setStatus({ code: SpanStatusCode.OK })

    l.info({ key: `action_client:success`, type, name, meta: logPayload })
  }

  s.end(duration)

  return result
})

export const authActionClient = actionClient.use(async ({ next }) => {
  const { user, session, supabase } = await checkAuthenticated()

  return next({ ctx: { user, session, supabase } })
})
