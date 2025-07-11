'use server'

import { authActionClient } from '@/lib/clients/action'
import { logger } from '@/lib/clients/logger'
import { Session } from '@supabase/supabase-js'

export const checkSessionAge = authActionClient
  .metadata({ serverFunctionName: 'checkSessionAge' })
  .action(async ({ ctx }) => {
    const { session } = ctx

    if (!session?.access_token) {
      return { requiresReauth: true }
    }

    const isSessionAgeValid = await isSessionAgeValidForPasswordUpdate(session)

    if (!isSessionAgeValid) {
      return { requiresReauth: true }
    }

    return { requiresReauth: false }
  })

export async function isSessionAgeValidForPasswordUpdate(session: Session) {
  try {
    const now = new Date()

    const tokenParts = session.access_token.split('.')
    if (tokenParts.length !== 3 || !tokenParts[1]) {
      throw new Error('Invalid JWT token format')
    }

    const payload = JSON.parse(atob(tokenParts[1]))
    const sessionCreatedAt = new Date(payload.iat * 1000) // 'iat' is in seconds, convert to milliseconds

    const sessionAgeMinutes =
      (now.getTime() - sessionCreatedAt.getTime()) / (1000 * 60)

    return sessionAgeMinutes < 5
  } catch (error) {
    logger.error(
      'VERIFY_SESSION_AGE_FOR_PASSWORD_UPDATE:UNEXPECTED_ERROR',
      error
    )

    return false
  }
}
