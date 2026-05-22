import 'server-only'

import type { AuthAdmin } from '../admin'

export const oryAuthAdmin: AuthAdmin = {
  // fail-closed: tRPC auth middleware treats null as unauthenticated
  getUserByAccessToken(_accessToken) {
    return Promise.resolve(null)
  },

  getUserById(_userId) {
    return Promise.resolve(null)
  },

  getEmailsByIds(_userIds) {
    return Promise.resolve(new Map<string, string | null>())
  },
}
