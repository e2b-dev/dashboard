import { createSafeActionClient } from 'next-safe-action'
import { checkAuthenticated, checkUserTeamAuthorization } from '../utils/server'
import { z } from 'zod'
import { UnknownError } from '@/types/errors'
import { logDebug, logError, logSuccess } from './logger'
import { ActionError } from '../utils/action'
import { VERBOSE } from '../utils/flags'

// keys that should not be logged for security/privacy reasons
const BLACKLISTED_INPUT_KEYS = [
  'accessToken',
  'password',
  'confirmPassword',
  'secret',
  'token',
  'apiKey',
]

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

  // filter out blacklisted keys from clientInput for logging
  let sanitizedInput: unknown = clientInput

  // handle object case
  if (
    typeof clientInput === 'object' &&
    clientInput !== null &&
    !Array.isArray(clientInput)
  ) {
    sanitizedInput = { ...(clientInput as Record<string, unknown>) }
    const sanitizedObj = sanitizedInput as Record<string, unknown>

    for (const key of BLACKLISTED_INPUT_KEYS) {
      if (key in sanitizedObj) {
        sanitizedObj[key] = '[REDACTED]'
      }
    }
  }
  // handle array case
  else if (Array.isArray(clientInput)) {
    sanitizedInput = [...clientInput]
    const sanitizedArray = sanitizedInput as unknown[]

    // check if any array elements are objects that need sanitizing
    for (let i = 0; i < sanitizedArray.length; i++) {
      const item = sanitizedArray[i]
      if (typeof item === 'object' && item !== null) {
        const sanitizedItem = { ...(item as Record<string, unknown>) }
        for (const key of BLACKLISTED_INPUT_KEYS) {
          if (key in sanitizedItem) {
            sanitizedItem[key] = '[REDACTED]'
          }
        }
        sanitizedArray[i] = sanitizedItem
      }
    }
  }

  if (
    result.serverError ||
    result.validationErrors ||
    result.success === false
  ) {
    logError(`${actionOrFunction} '${actionOrFunctionName}' failed:`, {
      result: rest,
      input: sanitizedInput,
    })
  } else if (VERBOSE) {
    logSuccess(`${actionOrFunction} '${actionOrFunctionName}' succeeded:`, {
      result: rest,
      input: sanitizedInput,
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
