import 'server-only'

import type { AuthAdmin } from '../admin'

export const oryAuthAdmin: AuthAdmin = {
  getUserByAccessToken(_accessToken) {
    throw new Error('oryAuthAdmin.getUserByAccessToken is not implemented yet')
  },

  getUserById(_userId) {
    throw new Error('oryAuthAdmin.getUserById is not implemented yet')
  },

  getEmailsByIds(_userIds) {
    throw new Error('oryAuthAdmin.getEmailsByIds is not implemented yet')
  },
}
