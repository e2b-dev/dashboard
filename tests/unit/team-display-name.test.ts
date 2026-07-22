import { describe, expect, it } from 'vitest'
import {
  getTeamDisplayName,
  getTransformedDefaultTeamName,
} from '@/core/modules/teams/utils'

describe('team display name', () => {
  it('transforms unchanged default team email names', () => {
    const transformed = getTransformedDefaultTeamName({
      email: 'ben.fornefeld@gmail.com',
      isDefault: true,
      name: 'ben.fornefeld@gmail.com',
    })

    expect(transformed).toBe("Ben.fornefeld's Project")
    expect(
      getTeamDisplayName({
        email: 'ben.fornefeld@gmail.com',
        isDefault: true,
        name: 'ben.fornefeld@gmail.com',
      })
    ).toBe("Ben.fornefeld's Project")
  })

  it('falls back to the raw team name otherwise', () => {
    expect(
      getTransformedDefaultTeamName({
        email: 'ben.fornefeld@gmail.com',
        isDefault: true,
        name: 'Platform Team',
      })
    ).toBeNull()

    expect(
      getTeamDisplayName({
        email: 'ben.fornefeld@gmail.com',
        isDefault: false,
        name: 'Platform Team',
      })
    ).toBe('Platform Team')
  })

  it('falls back to "Personal Project" when the email has no username part', () => {
    expect(
      getTransformedDefaultTeamName({
        email: '@gmail.com',
        isDefault: true,
        name: '@gmail.com',
      })
    ).toBe('Personal Project')

    expect(
      getTeamDisplayName({
        email: '@gmail.com',
        isDefault: true,
        name: '@gmail.com',
      })
    ).toBe('Personal Project')
  })
})
