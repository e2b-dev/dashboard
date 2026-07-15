import { describe, expect, it, vi } from 'vitest'
import { filterSidebarLinks, SIDEBAR_MAIN_LINKS } from '@/configs/sidebar'

describe('filterSidebarLinks', () => {
  it('shows each feature-flagged page independently', () => {
    const agentsOnly = filterSidebarLinks(
      SIDEBAR_MAIN_LINKS,
      (flagId) => flagId === 'agentsEnabled'
    )
    const connectionsOnly = filterSidebarLinks(
      SIDEBAR_MAIN_LINKS,
      (flagId) => flagId === 'connectionsEnabled'
    )
    const byocOnly = filterSidebarLinks(
      SIDEBAR_MAIN_LINKS,
      (flagId) => flagId === 'byocEnabled'
    )

    expect(agentsOnly.map((link) => link.label)).toContain('Agents')
    expect(agentsOnly.map((link) => link.label)).not.toContain('Connections')
    expect(agentsOnly.map((link) => link.label)).not.toContain('BYOC')
    expect(connectionsOnly.map((link) => link.label)).toContain('Connections')
    expect(connectionsOnly.map((link) => link.label)).not.toContain('Agents')
    expect(connectionsOnly.map((link) => link.label)).not.toContain('BYOC')
    expect(byocOnly.map((link) => link.label)).toContain('BYOC')
    expect(byocOnly.map((link) => link.label)).not.toContain('Agents')
    expect(byocOnly.map((link) => link.label)).not.toContain('Connections')
  })

  it('does not evaluate flags for unflagged links', () => {
    const isEnabled = vi.fn(() => false)
    const visibleLinks = filterSidebarLinks(SIDEBAR_MAIN_LINKS, isEnabled)

    expect(visibleLinks.map((link) => link.label)).not.toContain('Agents')
    expect(visibleLinks.map((link) => link.label)).not.toContain('Connections')
    expect(visibleLinks.map((link) => link.label)).not.toContain('BYOC')
    expect(isEnabled).toHaveBeenCalledTimes(3)
  })
})
