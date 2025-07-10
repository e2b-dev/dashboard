import { createSafeActionClient } from 'next-safe-action'
import { checkAuthenticated } from '../utils/server'
import { z } from 'zod'
import { ActionError } from '../utils/action'
import { UnknownError } from '@/types/errors'
import { l } from './logger'

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof ActionError) {
      return e.message
    }

    l.error('ACTION_CLIENT:UNEXPECTED_SERVER_ERROR', e)

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
  const startTime = performance.now()

  const result = await next()

  // strip ctx from result logging to avoid leaking sensitive data (supabase client)
  const { ctx, ...resultWithoutCtx } = result as Record<string, unknown>

  const actionOrFunctionName =
    metadata?.serverFunctionName || metadata?.actionName || 'Unknown action'

  const actionOrFunction = metadata?.serverFunctionName
    ? 'Server Function'
    : 'Server Action'

  const duration = performance.now() - startTime

  const logPayload = {
    actionOrFunction,
    actionOrFunctionName,
    durationMs: duration.toFixed(2),
    input: clientInput,
    result: resultWithoutCtx,
  }

  const error =
    result.serverError || result.validationErrors || result.success === false

  if (error) {
    l.error(`ACTION_CLIENT - ${actionOrFunctionName}`, error, logPayload)
  } else {
    l.info(`ACTION_CLIENT - ${actionOrFunctionName}`, logPayload)
  }

  return result
})

export const authActionClient = actionClient.use(async ({ next }) => {
  const { user, session, supabase } = await checkAuthenticated()

  return next({ ctx: { user, session, supabase } })
})
