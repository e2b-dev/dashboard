import 'server-only'

import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { supabaseAdmin } from '@/core/shared/clients/supabase/admin'
import type { AuthAdmin } from '../admin'
import { toAuthUser } from './user'

export const supabaseAuthAdmin: AuthAdmin = {
  async getUserById(userId) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (error) {
      l.error(
        {
          key: 'auth_admin:get_user_by_id:error',
          user_id: userId,
          error: serializeErrorForLog(error),
        },
        `supabase admin getUserById failed: ${error.message}`
      )
      return null
    }

    if (!data.user) {
      return null
    }

    return toAuthUser(data.user)
  },

  async getEmailsByIds(userIds) {
    const uniqueIds = [...new Set(userIds.filter(Boolean))]
    if (uniqueIds.length === 0) {
      return new Map<string, string | null>()
    }

    const { data, error } = await supabaseAdmin
      .from('auth_users')
      .select('id,email')
      .in('id', uniqueIds)

    if (error) {
      l.error(
        {
          key: 'auth_admin:get_emails_by_ids:error',
          error: serializeErrorForLog(error),
          context: {
            userCount: uniqueIds.length,
          },
        },
        `supabase admin getEmailsByIds failed: ${error.message}`
      )
      throw error
    }

    const result = new Map<string, string | null>()
    for (const row of data ?? []) {
      if (!row.id) continue
      result.set(row.id, row.email)
    }

    return result
  },
}
