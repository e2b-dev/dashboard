import { UnknownError } from '@/types/errors'
import { createSafeActionClient } from 'next-safe-action'
import { z } from 'zod'
import { ActionError } from '../utils/action'
import { checkAuthenticated } from '../utils/server'
import { l } from './logger'

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof ActionError) {
      return e.message
    }

    l.error('action_client:unexpected_error', e)

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

  const type = metadata?.serverFunctionName
    ? 'action'
    : 'function'

  const duration = performance.now() - startTime

  const meta = {
    durationMs: duration.toFixed(3),
    input: clientInput,
  }

  const error =
    result.serverError || result.validationErrors || result.success === false

  if (error) {
    l.warn(
      `action_client:${type} ${actionOrFunctionName}`,
      error,
      meta 
    )
  } else {
    l.info(
      `action_client:${type} ${actionOrFunctionName}`,
      meta 
    )
  }

  return result
})

export const authActionClient = actionClient.use(async ({ next }) => {
  const { user, session, supabase } = await checkAuthenticated()

  return next({ ctx: { user, session, supabase } })
})
