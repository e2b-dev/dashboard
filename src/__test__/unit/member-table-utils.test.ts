import { describe, expect, it } from 'vitest'
import type { TeamMember } from '@/core/modules/teams/models'
import {
  getAddedByMember,
  isSystemAddedMember,
  shouldShowRemoveMemberAction,
} from '@/features/dashboard/members/member-table.utils'

const createMember = ({
  addedBy = null,
  email,
  id,
  isDefault = false,
  name,
}: {
  addedBy?: string | null
  email: string
  id: string
  isDefault?: boolean
  name?: string
}): TeamMember => ({
  info: {
    id,
    email,
    name,
    createdAt: '2026-04-08T00:00:00.000Z',
  },
  relation: {
    added_by: addedBy,
    is_default: isDefault,
  },
})

describe('member table utils', () => {
  it('finds the inviter from the full member list', () => {
    const owner = createMember({
      email: 'owner@example.com',
      id: 'owner-id',
      isDefault: true,
      name: 'Owner',
    })
    const invited = createMember({
      addedBy: owner.info.id,
      email: 'invited@example.com',
      id: 'invited-id',
      name: 'Invited',
    })

    expect(getAddedByMember([owner, invited], invited.relation.added_by)).toBe(
      owner
    )
  })

  it('hides removal for default members and the current user', () => {
    const defaultMember = createMember({
      email: 'default@example.com',
      id: 'default-id',
      isDefault: true,
    })
    const currentUser = createMember({
      email: 'me@example.com',
      id: 'me-id',
    })
    const invited = createMember({
      email: 'invited@example.com',
      id: 'invited-id',
    })

    expect(shouldShowRemoveMemberAction(defaultMember, 'someone-else')).toBe(
      false
    )
    expect(shouldShowRemoveMemberAction(currentUser, currentUser.info.id)).toBe(
      false
    )
    expect(shouldShowRemoveMemberAction(invited, currentUser.info.id)).toBe(
      true
    )
  })

  it('treats self-added or unresolved rows as system-added', () => {
    const owner = createMember({
      email: 'owner@example.com',
      id: 'owner-id',
      isDefault: true,
    })
    const selfAdded = createMember({
      addedBy: owner.info.id,
      email: 'owner@example.com',
      id: 'owner-id',
      isDefault: true,
    })
    const invited = createMember({
      addedBy: owner.info.id,
      email: 'invited@example.com',
      id: 'invited-id',
    })

    expect(isSystemAddedMember(selfAdded, owner)).toBe(true)
    expect(isSystemAddedMember(invited, owner)).toBe(false)
    expect(isSystemAddedMember(invited, undefined)).toBe(true)
  })
})
