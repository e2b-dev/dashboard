import 'server-only'

import type { AuthAdmin } from '../admin'

export const oryAuthAdmin: AuthAdmin = {
  // fail-closed: callers treat null as unauthenticated / missing
  getUserById(_userId) {
    return Promise.resolve(null)
  },

  getEmailsByIds(_userIds) {
    return Promise.resolve(new Map<string, string | null>())
  },
}
