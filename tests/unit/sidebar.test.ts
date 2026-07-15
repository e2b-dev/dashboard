import { describe, expect, it, vi } from 'vitest'
import { filterSidebarLinks, SIDEBAR_MAIN_LINKS } from '@/configs/sidebar'

describe('filterSidebarLinks', () => {
  it('shows each feature-flagged page independently', () => {
    const agentsOnly = filterSidebarLinks(
      SIDEBAR_MAIN_LINKS,
      'agents-team',
      (flagId) => flagId === 'agentsEnabled',
      () => []
    )
    const connectionsOnly = filterSidebarLinks(
      SIDEBAR_MAIN_LINKS,
      'connections-team',
      () => false,
      (flagId) => (flagId === 'connectionsTeams' ? ['connections-team'] : [])
    )

    expect(agentsOnly.map((link) => link.label)).toContain('Agents')
    expect(agentsOnly.map((link) => link.label)).not.toContain('Connections')
    expect(connectionsOnly.map((link) => link.label)).toContain('Connections')
    expect(connectionsOnly.map((link) => link.label)).not.toContain('Agents')
  })

  it('does not evaluate flags for unflagged links', () => {
    const isEnabled = vi.fn(() => false)
    const getTeamIds = vi.fn(() => [])

    const visibleLinks = filterSidebarLinks(
      SIDEBAR_MAIN_LINKS,
      'disabled-team',
      isEnabled,
      getTeamIds
    )

    expect(visibleLinks.map((link) => link.label)).not.toContain('Agents')
    expect(visibleLinks.map((link) => link.label)).not.toContain('Connections')
    expect(isEnabled).toHaveBeenCalledTimes(1)
    expect(getTeamIds).toHaveBeenCalledTimes(1)
  })
})
