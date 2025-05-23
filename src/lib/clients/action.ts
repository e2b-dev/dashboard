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
  'key',
]

function sanitizeObject(data: unknown, blacklist: string[]): unknown {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const sanitized = { ...(data as Record<string, unknown>) }
    for (const key in sanitized) {
      if (blacklist.includes(key)) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = sanitizeObject(sanitized[key], blacklist)
      }
    }
    return sanitized
  } else if (Array.isArray(data)) {
    return data.map((item) => sanitizeObject(item, blacklist))
  }
  return data
}

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
  sanitizedInput = sanitizeObject(clientInput, BLACKLISTED_INPUT_KEYS)

  // Sanitize result object
  let sanitizedRest: unknown = rest
  sanitizedRest = sanitizeObject(rest, BLACKLISTED_INPUT_KEYS)

  if (
    result.serverError ||
    result.validationErrors ||
    result.success === false
  ) {
    logError(`${actionOrFunction} '${actionOrFunctionName}' failed:`, {
      result: sanitizedRest,
      input: sanitizedInput,
    })
  } else if (VERBOSE) {
    logSuccess(`${actionOrFunction} '${actionOrFunctionName}' succeeded:`, {
      result: sanitizedRest,
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
