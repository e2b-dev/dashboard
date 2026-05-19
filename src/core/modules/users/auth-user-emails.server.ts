import 'server-only'

import { supabaseAdmin } from '@/core/shared/clients/supabase/admin'

export type AuthUserEmailResolver = (
  userIds: string[]
) => Promise<Map<string, string | null>>

export async function getAuthUserEmailsById(
  userIds: string[]
): Promise<Map<string, string | null>> {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueUserIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabaseAdmin
    .from('auth_users')
    .select('id,email')
    .in('id', uniqueUserIds)

  if (error) {
    throw error
  }

  return new Map(
    data
      ?.filter((user) => user.id)
      .map((user) => [user.id as string, user.email]) ?? []
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
  } catch {
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
