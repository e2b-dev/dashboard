import 'server-only'

import type { Session } from 'next-auth'
import { auth as authjs } from '@/auth'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import type { AuthProvider } from '../provider'
import { fromAuthSession } from './identity'

export const oryAuthProvider: AuthProvider = {
  async getAuthContext() {
    let session: Session | null
    try {
      session = await authjs()
    } catch (error) {
      l.error(
        {
          key: 'auth_provider:ory_get_session:error',
          error: serializeErrorForLog(error),
        },
        'Auth.js auth() helper threw while reading session'
      )
      return null
    }

    if (!session?.user?.id || !session.accessToken) {
      return null
    }

    if (session.error) {
      l.warn(
        {
          key: 'auth_provider:ory_session_error',
          user_id: session.user.id,
          context: { error: session.error },
        },
        `Auth.js session reports error '${session.error}'; treating as unauthenticated`
      )
      return null
    }

    return {
      user: fromAuthSession(session),
      accessToken: session.accessToken,
    }
  },

  signOut() {
    return Promise.resolve({
      error: {
        message:
          'Ory sign-out must redirect through /api/auth/oauth/signout-flow',
        code: 'ory_sign_out_requires_route',
      },
    })
  },
}
