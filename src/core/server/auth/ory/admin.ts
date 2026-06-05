import 'server-only'

import { ResponseError } from '@ory/client-fetch'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import type { AuthAdmin } from '../admin'
import { getOryIdentityApi } from './client'
import {
  ACCOUNT_IDENTITY_CREDENTIALS,
  findOryIdentityBySubject,
} from './find-identity'
import { fromOryIdentity } from './identity'

const ORY_LIST_IDENTITIES_MAX_PAGE_SIZE = 1000

export const oryAuthAdmin: AuthAdmin = {
  async getUserById(userId) {
    try {
      const identity = await findOryIdentityBySubject(
        userId,
        ACCOUNT_IDENTITY_CREDENTIALS
      )
      return identity ? fromOryIdentity(identity, { userId }) : null
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

      for (const userId of uniqueIds) {
        if (result.has(userId)) continue

        const identity = await findOryIdentityBySubject(userId)
        if (!identity) continue

        const { email } = fromOryIdentity(identity, { userId })
        result.set(userId, email)
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
