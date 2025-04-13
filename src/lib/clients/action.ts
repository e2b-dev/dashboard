import { createSafeActionClient } from 'next-safe-action'
import { checkAuthenticated } from '../utils/server'
import { z } from 'zod'
import { UnknownError } from '@/types/errors'
import { logDebug, logError, logSuccess } from './logger'
import { ActionError } from '../utils/action'
import { VERBOSE } from '../utils/flags'

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof ActionError) {
      return e.message
    }

    logError('Unexpected server error:', e.message)

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
  let startTime
  if (VERBOSE) {
    startTime = performance.now()
  }

  const result = await next()

  // strip ctx from result logging to avoid leaking sensitive data (supabase client)
  const { ctx, ...rest } = result

  const actionOrFunctionName =
    metadata?.serverFunctionName || metadata?.actionName || 'Unknown action'

  const actionOrFunction = metadata.serverFunctionName
    ? 'Server Function'
    : 'Action'

  if (
    result.serverError ||
    result.validationErrors ||
    result.success === false
  ) {
    logError(`${actionOrFunction} '${actionOrFunctionName}' failed:`, {
      result: rest,
      input: clientInput,
    })
  } else if (VERBOSE) {
    logSuccess(`${actionOrFunction} '${actionOrFunctionName}' succeeded:`, {
      result: rest,
      input: clientInput,
    })
  }

  if (VERBOSE && startTime) {
    const endTime = performance.now()
    logDebug(
      `${actionOrFunction} '${actionOrFunctionName}' execution took ${endTime - startTime} ms`
    )
  }

  return result
})

export const authActionClient = actionClient.use(async ({ next }) => {
  const { user, session, supabase } = await checkAuthenticated()

  return next({ ctx: { user, session, supabase } })
})
