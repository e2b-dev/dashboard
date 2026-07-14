import { describe, expect, it, vi } from 'vitest'
import { filterSidebarLinks, SIDEBAR_MAIN_LINKS } from '@/configs/sidebar'

describe('filterSidebarLinks', () => {
  it('shows each feature-flagged page independently', () => {
    const agentsOnly = filterSidebarLinks(
      SIDEBAR_MAIN_LINKS,
      (flagId) => flagId === 'agentsEnabled'
    )
    const integrationsOnly = filterSidebarLinks(
      SIDEBAR_MAIN_LINKS,
      (flagId) => flagId === 'integrationsEnabled'
    )

    expect(agentsOnly.map((link) => link.label)).toContain('Agents')
    expect(agentsOnly.map((link) => link.label)).not.toContain('Integrations')
    expect(integrationsOnly.map((link) => link.label)).toContain('Integrations')
    expect(integrationsOnly.map((link) => link.label)).not.toContain('Agents')
  })

  it('does not evaluate flags for unflagged links', () => {
    const isEnabled = vi.fn(() => false)

    const visibleLinks = filterSidebarLinks(SIDEBAR_MAIN_LINKS, isEnabled)

    expect(visibleLinks.map((link) => link.label)).not.toContain('Agents')
    expect(visibleLinks.map((link) => link.label)).not.toContain('Integrations')
    expect(isEnabled).toHaveBeenCalledTimes(2)
  })
})
