import 'server-only'

import { ADMIN_AUTH_HEADERS } from '@/configs/api'
import { api } from '@/core/shared/clients/api'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

export type AuthUserEmailResolver = (
  userIds: string[]
) => Promise<Map<string, string | null>>

export async function getAuthUserEmailsById(
  userIds: string[]
): Promise<Map<string, string | null>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) {
    return new Map<string, string | null>()
  }

  const adminToken = process.env.DASHBOARD_API_ADMIN_TOKEN
  if (!adminToken) {
    throw new Error('DASHBOARD_API_ADMIN_TOKEN is not configured')
  }

  const { data, error, response } = await api.POST(
    '/admin/user-profiles/resolve',
    {
      headers: ADMIN_AUTH_HEADERS(adminToken),
      body: { userIds: uniqueIds },
    }
  )

  if (!response.ok || error) {
    l.error(
      {
        key: 'auth_user_emails:dashboard_api_error',
        error: serializeErrorForLog(error),
        context: {
          userCount: uniqueIds.length,
          status: response.status,
        },
      },
      'Failed to resolve creator emails from dashboard-api'
    )

    throw error ?? new Error('Failed to resolve creator emails')
  }

  return new Map(
    (data?.profiles ?? []).map((profile) => [profile.userId, profile.email])
  )
}

export async function resolveCreatorEmails<
  T extends {
    createdBy?: { id: string; email?: string | null } | null
  },
>(items: T[], resolveEmails: AuthUserEmailResolver): Promise<T[]> {
  const creatorUserIds = items.flatMap((item) => {
    const createdBy = item.createdBy
    if (!createdBy) {
      return []
    }

    return [createdBy.id]
  })

  if (creatorUserIds.length === 0) {
    return items
  }

  let emailByUserId: Map<string, string | null>
  try {
    emailByUserId = await resolveEmails(creatorUserIds)
  } catch (error) {
    l.warn(
      {
        key: 'auth_user_emails:resolve_failed',
        error: serializeErrorForLog(error),
        context: {
          userCount: new Set(creatorUserIds).size,
        },
      },
      'Failed to resolve creator emails from dashboard-api'
    )

    return items
  }

  return items.map((item) => {
    const createdBy = item.createdBy
    if (!createdBy) {
      return item
    }

    return {
      ...item,
      createdBy: {
        ...createdBy,
        email: emailByUserId.get(createdBy.id) ?? null,
      },
    }
  })
}
