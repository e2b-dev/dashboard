import 'server-only'

import { ResponseError } from '@ory/client-fetch'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import type { AuthAdmin } from '../admin'
import { getOryIdentityApi } from './client'
import { fromOryIdentity } from './identity'

const ORY_LIST_IDENTITIES_MAX_PAGE_SIZE = 1000

export const oryAuthAdmin: AuthAdmin = {
  async getUserById(userId) {
    try {
      const identity = await getOryIdentityApi().getIdentity({ id: userId })
      return fromOryIdentity(identity)
    } catch (error) {
      if (error instanceof ResponseError && error.response.status === 404) {
        return null
      }
      l.error(
        {
          key: 'auth_admin:ory_get_user_by_id:error',
          user_id: userId,
          error: serializeErrorForLog(error),
        },
        'oryAuthAdmin.getUserById failed'
      )
      return null
    }
  },

  async getEmailsByIds(userIds) {
    const uniqueIds = [...new Set(userIds.filter(Boolean))]
    if (uniqueIds.length === 0) {
      return new Map<string, string | null>()
    }

    try {
      const result = new Map<string, string | null>()

      for (
        let start = 0;
        start < uniqueIds.length;
        start += ORY_LIST_IDENTITIES_MAX_PAGE_SIZE
      ) {
        const ids = uniqueIds.slice(
          start,
          start + ORY_LIST_IDENTITIES_MAX_PAGE_SIZE
        )
        const identities = await getOryIdentityApi().listIdentities({
          ids,
          pageSize: ids.length,
        })

        for (const identity of identities) {
          const { email } = fromOryIdentity(identity)
          result.set(identity.id, email)
        }
      }

      return result
    } catch (error) {
      l.error(
        {
          key: 'auth_admin:ory_get_emails_by_ids:error',
          context: { count: uniqueIds.length },
          error: serializeErrorForLog(error),
        },
        'oryAuthAdmin.getEmailsByIds failed'
      )
      return new Map<string, string | null>()
    }
  },
}
